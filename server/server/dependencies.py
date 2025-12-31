# FastAPI多个依赖函数
# dependencies.py
# async def get_db_session(...):
#     ...

# async def get_cache(...):  # 可能将来添加
#     ...

# async def get_current_settings(...):  # 可能将来添加
#     ...

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request


async def get_db_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """
    Create and get database session.

    :param request: current request.
    :yield: database session.
    """
    session: AsyncSession = request.app.state.db_session_factory()

    try:
        yield session
    finally:
        await session.close()
