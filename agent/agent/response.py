"""Agent 统一响应格式。

与 Server 保持一致的响应规范:
- code: 业务状态码 (0=成功, 2000-2999=Agent错误)
- msg: 提示信息
- data: 业务数据
"""

from typing import Any, Dict, List, Optional


class AgentResponse:
    """Agent 统一响应格式。"""

    @staticmethod
    def success(
        data: Any = None,
        msg: str = "success",
    ) -> Dict[str, Any]:
        """
        成功响应。

        :param data: 响应数据
        :param msg: 响应消息
        :return: 响应字典
        """
        return {"code": 0, "msg": msg, "data": data}

    @staticmethod
    def error(
        code: int = 2000,
        msg: str = "Agent 服务错误",
        data: Any = None,
    ) -> Dict[str, Any]:
        """
        错误响应。

        :param code: 错误码 (2000-2999)
        :param msg: 错误消息
        :param data: 可选的错误详情
        :return: 响应字典
        """
        return {"code": code, "msg": msg, "data": data}


# 快捷函数
def success_response(
    answer: str,
    sources: Optional[List[Dict]] = None,
    metadata: Optional[Dict] = None,
) -> Dict[str, Any]:
    """
    成功响应 - 问答场景。

    :param answer: 答案文本
    :param sources: 来源文档列表
    :param metadata: 元数据 (如置信度、处理时间等)
    :return: 响应字典
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
    错误响应。

    :param code: 错误码
    :param msg: 错误消息
    :param error_detail: 错误详情
    :return: 响应字典
    """
    data = {"error_detail": error_detail} if error_detail else None
    return AgentResponse.error(code=code, msg=msg, data=data)


# 错误码常量 (与 Server 保持一致)
class AgentErrorCode:
    """Agent 错误码常量。"""
    
    SUCCESS = 0
    AGENT_ERROR = 2000  # Agent 通用错误
    RAG_RETRIEVAL_ERROR = 2001  # RAG 检索失败
    LLM_CALL_ERROR = 2002  # LLM 调用失败
    VECTOR_DB_ERROR = 2003  # 向量数据库错误
    EMBEDDING_ERROR = 2004  # Embedding 生成失败
    NO_RELEVANT_RESULTS = 2005  # 无相关结果
    QUESTION_FORMAT_ERROR = 2006  # 问题格式错误
    AGENT_TIMEOUT = 2007  # Agent 处理超时
    AGENT_INITIALIZATION_ERROR = 2008  # Agent 初始化失败
