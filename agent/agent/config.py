"""
RAG系统配置文件
"""

# Ollama模型配置
EMBED_MODEL = "nomic-embed-text" # 嵌入模型
CHAT_MODEL = "llama3.2:latest" # 对话模型
OLLAMA_HOST = "http://localhost:11434"

# Weaviate配置
WEAVIATE_URL = "http://localhost:8080"
WEAVIATE_CLASS = "ServiceTickets"

# 数据配置
DATA_PATH = "data/service_tickets.csv"

# RAG参数
TOP_K = 5  # 检索文档数量
SIMILARITY_THRESHOLD = 0.3  # 相似度阈值

# 提示词模板
SYSTEM_PROMPT = """
你是一个客服知识库助手。基于历史工单记录，帮助客服人员快速找到问题的解决方案。

回答要求：
1. 使用中文回答
2. 基于历史工单的解决方案回答，不要编造
3. 提供具体的处理步骤和建议
4. 如果有类似案例，可以引用工单编号
5. 回答要专业、清晰、可操作
""" 

QA_PROMPT_TEMPLATE = """
基于以下历史客服工单记录，回答客服人员的问题：

历史工单记录:
{context}

客服问题: {question}

请根据上述工单经验，提供专业的解决方案和处理建议：
"""