"""models."""
import pkgutil
from pathlib import Path


def load_all_models() -> None:
    """Load all models from this folder."""
    package_dir = Path(__file__).resolve().parent
    modules = pkgutil.walk_packages(
        path=[str(package_dir)],
        prefix="server.models.",
    )
    for module in modules:
        __import__(module.name)


from server.models.conversation_model import Conversation, Message
from server.models.user_model import User

__all__ = ["User", "Conversation", "Message", "load_all_models"]
