# ORM 基类
from sqlalchemy.orm import DeclarativeBase

from server.models.meta import meta


class Base(DeclarativeBase):
    """Base for all models."""

    metadata = meta
