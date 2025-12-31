"""User DAO for database operations."""

from typing import List, Optional

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.dependencies import get_db_session
from server.models.user_model import User


class UserDAO:
    """DAO for User model."""

    def __init__(self, session: AsyncSession = Depends(get_db_session)):
        """Initialize UserDAO with database session."""
        self.session = session

    async def create_user(
        self,
        username: str,
        email: str,
        hashed_password: str,
        full_name: str | None = None,
    ) -> User:
        """
        Create a new user.

        :param username: username.
        :param email: email address.
        :param hashed_password: hashed password.
        :param full_name: full name (optional).
        :return: created user.
        """
        user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Get user by ID.

        :param user_id: user ID.
        :return: user or None.
        """
        result = await self.session.execute(
            select(User).where(User.id == user_id),
        )
        return result.scalar_one_or_none()

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """
        Get user by username.

        :param username: username.
        :return: user or None.
        """
        result = await self.session.execute(
            select(User).where(User.username == username),
        )
        return result.scalar_one_or_none()

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email.

        :param email: email address.
        :return: user or None.
        """
        result = await self.session.execute(
            select(User).where(User.email == email),
        )
        return result.scalar_one_or_none()

    async def get_all_users(
        self,
        limit: int = 10,
        offset: int = 0,
    ) -> List[User]:
        """
        Get all users with pagination.

        :param limit: limit of users.
        :param offset: offset of users.
        :return: list of users.
        """
        result = await self.session.execute(
            select(User).limit(limit).offset(offset),
        )
        return list(result.scalars().all())

    async def update_user(
        self,
        user_id: int,
        email: str | None = None,
        full_name: str | None = None,
        is_active: bool | None = None,
    ) -> Optional[User]:
        """
        Update user information.

        :param user_id: user ID.
        :param email: new email (optional).
        :param full_name: new full name (optional).
        :param is_active: new active status (optional).
        :return: updated user or None.
        """
        user = await self.get_user_by_id(user_id)
        if not user:
            return None

        if email is not None:
            user.email = email
        if full_name is not None:
            user.full_name = full_name
        if is_active is not None:
            user.is_active = is_active

        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def delete_user(self, user_id: int) -> bool:
        """
        Delete user by ID.

        :param user_id: user ID.
        :return: True if deleted, False if not found.
        """
        user = await self.get_user_by_id(user_id)
        if not user:
            return False

        await self.session.delete(user)
        await self.session.commit()
        return True
