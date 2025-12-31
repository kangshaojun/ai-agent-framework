import uvicorn

from server.settings import settings


# dev: reload=True, workers=1
# prod: reload=False, workers=CPU核心数
def main() -> None:
    """Entrypoint of the application."""
    uvicorn.run(
        "server.web.app:get_app",
        workers=settings.workers_count,
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level=settings.log_level.value.lower(),
        factory=True,
    )


if __name__ == "__main__":
    main()
