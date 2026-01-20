"""Business error code definitions.

Error code specification:
- 0: Success
- 1000: Parameter error
- 1001: Business logic error
- 1002: Data processing error
- Others: Custom business errors
"""

from enum import IntEnum


class ErrorCode(IntEnum):
    """Business error code enumeration."""

    # Success
    SUCCESS = 0

    # General errors (1000-1099)
    PARAM_ERROR = 1000  # Parameter error
    BUSINESS_ERROR = 1001  # Business logic error
    DATA_ERROR = 1002  # Data processing error
    PERMISSION_DENIED = 1003  # Permission denied
    RESOURCE_NOT_FOUND = 1004  # Resource not found
    OPERATION_FAILED = 1005  # Operation failed

    # User related errors (1100-1199)
    USER_NOT_FOUND = 1100  # User not found
    USER_ALREADY_EXISTS = 1101  # User already exists
    USER_DISABLED = 1102  # User disabled
    INVALID_CREDENTIALS = 1103  # Invalid credentials
    TOKEN_EXPIRED = 1104  # Token expired
    TOKEN_INVALID = 1105  # Token invalid

    # Conversation related errors (1200-1299)
    CONVERSATION_NOT_FOUND = 1200  # Conversation not found
    CONVERSATION_ACCESS_DENIED = 1201  # Conversation access denied
    MESSAGE_SEND_FAILED = 1202  # Message send failed
    MESSAGE_NOT_FOUND = 1203  # Message not found

    # Database related errors (1300-1399)
    DATABASE_ERROR = 1300  # Database error
    DATABASE_CONNECTION_ERROR = 1301  # Database connection error
    DUPLICATE_ENTRY = 1302  # Duplicate entry

    # External service errors (1400-1499)
    EXTERNAL_SERVICE_ERROR = 1400  # External service error
    MCP_SERVICE_ERROR = 1401  # MCP service error
    API_CALL_FAILED = 1402  # API call failed

    # Agent related errors (2000-2999)
    AGENT_ERROR = 2000  # Agent general error
    RAG_RETRIEVAL_ERROR = 2001  # RAG retrieval failed
    LLM_CALL_ERROR = 2002  # LLM call failed
    VECTOR_DB_ERROR = 2003  # Vector database error
    EMBEDDING_ERROR = 2004  # Embedding generation failed
    NO_RELEVANT_RESULTS = 2005  # No relevant results
    QUESTION_FORMAT_ERROR = 2006  # Question format error
    AGENT_TIMEOUT = 2007  # Agent processing timeout
    AGENT_INITIALIZATION_ERROR = 2008  # Agent initialization failed


# Default messages for error codes
ERROR_MESSAGES = {
    ErrorCode.SUCCESS: "success",
    ErrorCode.PARAM_ERROR: "Parameter error",
    ErrorCode.BUSINESS_ERROR: "Business logic error",
    ErrorCode.DATA_ERROR: "Data processing error",
    ErrorCode.PERMISSION_DENIED: "Permission denied",
    ErrorCode.RESOURCE_NOT_FOUND: "Resource not found",
    ErrorCode.OPERATION_FAILED: "Operation failed",
    ErrorCode.USER_NOT_FOUND: "User not found",
    ErrorCode.USER_ALREADY_EXISTS: "User already exists",
    ErrorCode.USER_DISABLED: "User disabled",
    ErrorCode.INVALID_CREDENTIALS: "Invalid username or password",
    ErrorCode.TOKEN_EXPIRED: "Token expired",
    ErrorCode.TOKEN_INVALID: "Token invalid",
    ErrorCode.CONVERSATION_NOT_FOUND: "Conversation not found",
    ErrorCode.CONVERSATION_ACCESS_DENIED: "Conversation access denied",
    ErrorCode.MESSAGE_SEND_FAILED: "Message send failed",
    ErrorCode.MESSAGE_NOT_FOUND: "Message not found",
    ErrorCode.DATABASE_ERROR: "Database error",
    ErrorCode.DATABASE_CONNECTION_ERROR: "Database connection error",
    ErrorCode.DUPLICATE_ENTRY: "Duplicate entry",
    ErrorCode.EXTERNAL_SERVICE_ERROR: "External service error",
    ErrorCode.MCP_SERVICE_ERROR: "MCP service error",
    ErrorCode.API_CALL_FAILED: "API call failed",
    ErrorCode.AGENT_ERROR: "Agent service error",
    ErrorCode.RAG_RETRIEVAL_ERROR: "RAG retrieval failed",
    ErrorCode.LLM_CALL_ERROR: "LLM call failed",
    ErrorCode.VECTOR_DB_ERROR: "Vector database error",
    ErrorCode.EMBEDDING_ERROR: "Embedding generation failed",
    ErrorCode.NO_RELEVANT_RESULTS: "No relevant results found",
    ErrorCode.QUESTION_FORMAT_ERROR: "Question format error",
    ErrorCode.AGENT_TIMEOUT: "Agent processing timeout",
    ErrorCode.AGENT_INITIALIZATION_ERROR: "Agent initialization failed",
}


def get_error_message(code: ErrorCode) -> str:
    """
    Get default message for error code.

    :param code: Error code
    :return: Error message
    """
    return ERROR_MESSAGES.get(code, "Unknown error")
