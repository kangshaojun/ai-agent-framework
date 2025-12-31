"""User API views for registration and login."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException

from server.dao.user_dao import UserDAO
from server.auth import (
    get_current_user,
    get_current_superuser,
    verify_refresh_token,
)
from server.utils.jwt import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from server.models.user_model import User
from server.web.api.response import ApiResponse
from server.web.api.users.schema import (
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
)

router = APIRouter()


@router.post("/register", response_model=ApiResponse[UserResponse], status_code=201)
async def register_user(
    user_data: UserCreate,
    user_dao: UserDAO = Depends(),
) -> ApiResponse[UserResponse]:
    """
    注册新用户。

    :param user_data: 用户注册数据.
    :param user_dao: 用户 DAO.
    :return: 创建的用户信息.
    """
    # 检查用户名是否已存在
    existing_user = await user_dao.get_user_by_username(user_data.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="用户名已存在")

    # 检查邮箱是否已存在
    existing_email = await user_dao.get_user_by_email(user_data.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="邮箱已被注册")

    # 创建用户
    hashed_password = get_password_hash(user_data.password)
    user = await user_dao.create_user(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
    )
    return ApiResponse.success(data=UserResponse.model_validate(user), msg="注册成功")


@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login_user(
    login_data: UserLogin,
    user_dao: UserDAO = Depends(),
) -> ApiResponse[TokenResponse]:
    """
    用户登录，返回 JWT token。

    :param login_data: 登录数据.
    :param user_dao: 用户 DAO.
    :return: access_token 和 refresh_token.
    """
    # 查找用户
    user = await user_dao.get_user_by_username(login_data.username)
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    # 验证密码
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    # 检查用户是否激活
    if not user.is_active:
        raise HTTPException(status_code=403, detail="用户已被禁用")

    # 生成 tokens
    access_token = create_access_token(data={"user_id": user.id, "username": user.username})
    refresh_token = create_refresh_token(data={"user_id": user.id})

    token_data = TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # 转换为秒
    )
    return ApiResponse.success(data=token_data, msg="登录成功")


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh_token(
    payload: dict = Depends(verify_refresh_token),
    user_dao: UserDAO = Depends(),
) -> ApiResponse[TokenResponse]:
    """
    使用 refresh token 刷新 access token。

    :param payload: refresh token 的 payload.
    :param user_dao: 用户 DAO.
    :return: 新的 access_token 和 refresh_token.
    """
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="无效的 refresh token")

    # 验证用户是否存在且激活
    user = await user_dao.get_user_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="用户不存在或已被禁用")

    # 生成新的 tokens
    access_token = create_access_token(data={"user_id": user.id, "username": user.username})
    refresh_token = create_refresh_token(data={"user_id": user.id})

    token_data = TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return ApiResponse.success(data=token_data, msg="刷新成功")


@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> ApiResponse[UserResponse]:
    """
    获取当前登录用户的信息（需要认证）。

    :param current_user: 当前用户（从 token 中获取）.
    :return: 用户信息.
    """
    return ApiResponse.success(data=UserResponse.model_validate(current_user))


@router.get("/", response_model=List[UserResponse])
async def get_users(
    limit: int = 10,
    offset: int = 0,
    user_dao: UserDAO = Depends(),
    current_user: User = Depends(get_current_superuser),
) -> List[UserResponse]:
    """
    获取所有用户列表（需要超级管理员权限）。

    :param limit: 返回数量限制.
    :param offset: 偏移量.
    :param user_dao: 用户 DAO.
    :param current_user: 当前用户（必须是超级管理员）.
    :return: 用户列表.
    """
    users = await user_dao.get_all_users(limit=limit, offset=offset)
    return [UserResponse.model_validate(user) for user in users]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    user_dao: UserDAO = Depends(),
) -> UserResponse:
    """
    根据 ID 获取用户信息。

    :param user_id: 用户 ID.
    :param user_dao: 用户 DAO.
    :return: 用户信息.
    """
    user = await user_dao.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    user_dao: UserDAO = Depends(),
) -> UserResponse:
    """
    更新用户信息。

    :param user_id: 用户 ID.
    :param user_data: 更新数据.
    :param user_dao: 用户 DAO.
    :return: 更新后的用户信息.
    """
    user = await user_dao.update_user(
        user_id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        is_active=user_data.is_active,
    )
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    user_dao: UserDAO = Depends(),
) -> None:
    """
    删除用户。

    :param user_id: 用户 ID.
    :param user_dao: 用户 DAO.
    """
    deleted = await user_dao.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="用户不存在")
