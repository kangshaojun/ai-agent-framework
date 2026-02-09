# server/web/api/router.py

from fastapi.routing import APIRouter

from server.web.api import conversations, docs, help, monitoring, users

api_router = APIRouter()

# Core routes
api_router.include_router(monitoring.router)
api_router.include_router(docs.router)

# User routes - authentication and user management
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Conversation and message routes - chat functionality
api_router.include_router(
    conversations.router, prefix="/conversations", tags=["conversations"]
)

# Help center routes - documentation and support
api_router.include_router(help.router, prefix="/help", tags=["help"])
