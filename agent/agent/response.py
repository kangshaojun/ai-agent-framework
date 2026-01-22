"""Agent unified response format.

Consistent response specification with Server:
- code: Business status code (0=success, 2000-2999=Agent error)
- msg: Message
- data: Business data
"""

from typing import Any, Dict, List, Optional


class AgentResponse:
    """Agent unified response format."""

    @staticmethod
    def success(
        data: Any = None,
        msg: str = "success",
    ) -> Dict[str, Any]:
        """
        Success response.

        :param data: Response data
        :param msg: Response message
        :return: Response dict
        """
        return {"code": 0, "msg": msg, "data": data}

    @staticmethod
    def error(
        code: int = 2000,
        msg: str = "Agent service error",
        data: Any = None,
    ) -> Dict[str, Any]:
        """
        Error response.

        :param code: Error code (2000-2999)
        :param msg: Error message
        :param data: Optional error details
        :return: Response dict
        """
        return {"code": code, "msg": msg, "data": data}


# Shortcut functions
def success_response(
    answer: str,
    sources: Optional[List[Dict]] = None,
    metadata: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    Success response - Q&A scenario.

    :param answer: Answer text
    :param sources: Source document list
    :param metadata: Metadata (e.g., confidence, processing time)
    :return: Response dict
    """
    data = {"answer": answer}
    
    if sources is not None:
        data["sources"] = sources
    
    if metadata is not None:
        data["metadata"] = metadata
    
    return AgentResponse.success(data=data)


def error_response(
    code: int = 2000,
    msg: str = "Agent 服务错误",
    error_detail: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Error response.

    :param code: Error code
    :param msg: Error message
    :param error_detail: Error details
    :return: Response dict
    """
    data = {"error_detail": error_detail} if error_detail else None
    return AgentResponse.error(code=code, msg=msg, data=data)


# Error code constants (consistent with Server)
class AgentErrorCode:
    """Agent error code constants."""
    
    SUCCESS = 0
    AGENT_ERROR = 2000  # Agent general error
    RAG_RETRIEVAL_ERROR = 2001  # RAG retrieval failed
    LLM_CALL_ERROR = 2002  # LLM call failed
    VECTOR_DB_ERROR = 2003  # Vector database error
    EMBEDDING_ERROR = 2004  # Embedding generation failed
    NO_RELEVANT_RESULTS = 2005  # No relevant results
    QUESTION_FORMAT_ERROR = 2006  # Question format error
    AGENT_TIMEOUT = 2007  # Agent processing timeout
    AGENT_INITIALIZATION_ERROR = 2008  # Agent initialization failed
