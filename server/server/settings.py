# server/settings.py

import enum
import os
from pathlib import Path
from tempfile import gettempdir
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from yarl import URL

# 获取当前文件所在目录
BASE_DIR = Path(__file__).parent

TEMP_DIR = Path(gettempdir())


class LogLevel(str, enum.Enum):
    """Possible log levels."""

    NOTSET = "NOTSET"
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    FATAL = "FATAL"


class Settings(BaseSettings):
    host: str = "0.0.0.0"
    port: int = 8000
    workers_count: int = 1
    reload: bool = False

    environment: str = "dev"

    log_level: LogLevel = LogLevel.INFO

    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "server"
    db_pass: str = "server"
    db_base: str = "server"
    db_echo: bool = False

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_user: Optional[str] = None
    redis_pass: Optional[str] = "server"
    redis_base: Optional[int] = None

    agent_base_url: str = "http://localhost:8001"

    @property
    def db_url(self) -> URL:
        return URL.build(
            scheme="postgresql+asyncpg",
            host=self.db_host,
            port=self.db_port,
            user=self.db_user,
            password=self.db_pass,
            path=f"/{self.db_base}",
        )

    @property
    def redis_url(self) -> URL:
        path = "/0"
        if self.redis_base is not None:
            path = f"/{self.redis_base}"
        return URL.build(
            scheme="redis",
            host=self.redis_host,
            port=self.redis_port,
            user=self.redis_user,
            password=self.redis_pass,
            path=path,
        )


    model_config = SettingsConfigDict(
        env_file=BASE_DIR.parent / ".env",
        env_prefix="SERVER_",
        env_file_encoding="utf-8",
    )


settings = Settings()
