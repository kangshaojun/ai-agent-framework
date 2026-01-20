"""认证相关的依赖注入。"""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from server.dao.user_dao import UserDAO
from server.dependencies import get_db_session
from server.utils.jwt import decode_token, verify_token_type
from server.models.user_model import User

# HTTP Bearer 认证方案
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_db_session),
) -> User:
    """
    从 JWT token 中获取当前用户。

    这是一个依赖函数，用于保护需要认证的路由。

    :param credentials: HTTP Bearer 认证凭证
    :param session: 数据库会话
    :return: 当前用户对象
    :raises HTTPException: 认证失败时抛出 401 错误
    """
    token = credentials.credentials

    # 解码 token
    payload = decode_token(token)

    # 验证是 access token
    verify_token_type(payload, "access")

    # 从 payload 中获取用户 ID
    user_id: Optional[int] = payload.get("user_id")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 中缺少用户信息",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 从数据库查询用户
    user_dao = UserDAO(session)
    user = await user_dao.get_user_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has been disabled",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    获取当前活跃用户（已验证且未被禁用）。

    :param current_user: 当前用户
    :return: 当前用户对象
    :raises HTTPException: 用户未激活时抛出 403 错误
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has been disabled",
        )
    return current_user


async def get_current_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    获取当前超级管理员用户。

    :param current_user: 当前用户
    :return: 当前用户对象
    :raises HTTPException: 用户不是超级管理员时抛出 403 错误
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足，需要超级管理员权限",
        )
    return current_user


def verify_refresh_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    验证 refresh token。

    :param credentials: HTTP Bearer 认证凭证
    :return: 解码后的 token payload
    :raises HTTPException: token 无效时抛出 401 错误
    """
    token = credentials.credentials
    payload = decode_token(token)
    verify_token_type(payload, "refresh")
    return payload
