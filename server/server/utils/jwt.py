# server/db/jwt.py

from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from jose import JWTError, jwt
from passlib.context import CryptContext

# 创建密码上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 配置常量
SECRET_KEY = "ai-agent-framework-secret-key-2024"  # 生产环境应该从环境变量读取
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Access token 过期时间：30分钟
REFRESH_TOKEN_EXPIRE_DAYS = 7  # Refresh token 过期时间：7天


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建 Access Token。

    :param data: 要编码的数据（通常包含 user_id, username 等）
    :param expires_delta: 自定义过期时间
    :return: JWT token 字符串
    """
    to_encode = data.copy()
    if expires_delta is None:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    创建 Refresh Token。

    :param data: 要编码的数据（通常包含 user_id）
    :param expires_delta: 自定义过期时间
    :return: JWT token 字符串
    """
    to_encode = data.copy()
    if expires_delta is None:
        expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """
    解码并验证 JWT token。

    :param token: JWT token 字符串
    :return: 解码后的 payload
    :raises HTTPException: token 无效或过期时抛出
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"无效的认证凭证: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_token_type(payload: dict, expected_type: str) -> None:
    """
    验证 token 类型。

    :param payload: 解码后的 token payload
    :param expected_type: 期望的 token 类型（access 或 refresh）
    :raises HTTPException: token 类型不匹配时抛出
    """
    token_type = payload.get("type")
    if token_type != expected_type:
        raise HTTPException(
            status_code=401,
            detail=f"Token 类型错误，期望 {expected_type}，实际 {token_type}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_password_hash(password: str) -> str:
    """
    对密码进行哈希加密。

    :param password: 明文密码
    :return: 加密后的密码
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码是否正确。

    :param plain_password: 明文密码
    :param hashed_password: 加密后的密码
    :return: 密码是否匹配
    """
    return pwd_context.verify(plain_password, hashed_password)
