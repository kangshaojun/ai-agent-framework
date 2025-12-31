"""User schemas for API requests and responses."""

import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


class UserCreate(BaseModel):
    """Schema for creating a new user (registration)."""

    username: str
    email: str
    password: str
    full_name: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """简单的邮箱格式验证."""
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, v):
            raise ValueError("邮箱格式不正确")
        return v


class UserLogin(BaseModel):
    """Schema for user login."""

    username: str
    password: str


class TokenResponse(BaseModel):
    """Schema for token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # access token 过期时间（秒）


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request."""

    refresh_token: str


class UserResponse(BaseModel):
    """Schema for user response (without password)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    full_name: str | None
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    """Schema for updating user information."""

    email: str | None = None
    full_name: str | None = None
    is_active: bool | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        """简单的邮箱格式验证."""
        if v is None:
            return v
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, v):
            raise ValueError("邮箱格式不正确")
        return v
