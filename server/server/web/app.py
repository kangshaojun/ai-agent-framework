from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import UJSONResponse
from fastapi.staticfiles import StaticFiles

# 跨域
from fastapi.middleware.cors import CORSMiddleware

from server.logging import configure_logging
from server.web.api.router import api_router
from server.web.app_events import register_shutdown_event, register_startup_event

APP_ROOT = Path(__file__).parent.parent


def get_app() -> FastAPI:
    """
    Get FastAPI application
    """
    configure_logging()
    app = FastAPI(
        title="server",
        version="0.1.0",
        docs_url=None,
        redoc_url=None,
        openapi_url="/api/openapi.json",
        default_response_class=UJSONResponse,
    )

    # Adds startup and shutdown events.
    register_startup_event(app)
    register_shutdown_event(app)

    # Main router for the API.
    app.include_router(router=api_router, prefix="/api")

    # Static directory.
    app.mount(
        "/static",
        StaticFiles(directory=APP_ROOT / "static"),
        name="static",
    )

    # 跨域
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 允许所有来源
        allow_credentials=True,
        allow_methods=["*"],  # 允许的HTTP方法
        allow_headers=["*"],  # 允许的HTTP头部
    )

    return app
