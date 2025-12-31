"""
客服工单智能助手
"""
import os
import time
from typing import Dict, List
import weaviate
import weaviate.classes as wvc
from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from .import_data import TicketImportData
from . import config
from .response import success_response, error_response, AgentErrorCode


class ServiceTicketAgent:
    """客服工单智能助手"""
    
    def __init__(self, data_path: str = None):
        # 处理路径，确保相对于项目根目录
        if data_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(current_dir)
            self.data_path = os.path.join(project_root, config.DATA_PATH)
        else:
            self.data_path = data_path
            
        self.weaviate_url = config.WEAVIATE_URL
        self.embed_model = config.EMBED_MODEL
        self.chat_model = config.CHAT_MODEL
        self.class_name = config.WEAVIATE_CLASS
        
        # 初始化智能助手组件
        self._setup_components()
        
        # 检查是否需要重新构建数据库
        self._setup_database()
    
    def _setup_components(self):
        """初始化智能助手组件"""
        print("初始化客服智能助手组件...")
        
        # 1. 嵌入模型
        self.embeddings = OllamaEmbeddings(
            model=self.embed_model,
            base_url=config.OLLAMA_HOST
        )
        
        # 2. 聊天模型
        self.llm = ChatOllama(
            model=self.chat_model,
            base_url=config.OLLAMA_HOST,
            temperature=0.1
        )
        
        # 3. Weaviate 客户端
        self.client = weaviate.connect_to_local(
            host="localhost",
            port=8080,
            grpc_port=50051
        )
        
        # 4. 提示词模板
        self.prompt_template = PromptTemplate(
            input_variables=["context", "question"],
            template=config.QA_PROMPT_TEMPLATE
        )
        
        print("客服智能助手组件初始化完成")
    
    def _setup_database(self):
        """设置向量数据库"""
        try:
            # 强制删除旧的类（如果存在）并重新构建
            if self.client.collections.exists(self.class_name):
                print(f"删除已存在的 {self.class_name} 类...")
                self.client.collections.delete(self.class_name)
            
            print("初始化新的工单数据库...")
            self._build_database()
                
        except Exception as e:
            print(f"连接 Weaviate 失败: {e}")
            print("初始化新的工单数据库...")
            self._build_database()
    
    def _build_database(self):
        """构建向量数据库"""
        print("开始构建向量数据库...")
        
        # 1. 加载和准备数据
        loader = TicketImportData(self.data_path)
        tickets = loader.load_and_prepare()
        
        # 2. 创建新的 Weaviate 类
        self.collection = self.client.collections.create(
            name=self.class_name,
            properties=[
                wvc.config.Property(name="content", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="ticket_id", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="issue_type", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="priority", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="status", data_type=wvc.config.DataType.TEXT),
            ]
        )
        
        # 3. 准备数据并插入
        for ticket in tickets:
            # 生成向量
            vector = self.embeddings.embed_query(ticket['text'])
            
            # 插入数据
            self.collection.data.insert(
                properties={
                    "content": ticket['text'],
                    "ticket_id": ticket['metadata'].get('ticket_id', ''),
                    "issue_type": ticket['metadata'].get('issue_type', ''),
                    "priority": ticket['metadata'].get('priority', ''),
                    "status": ticket['metadata'].get('status', ''),
                },
                vector=vector
            )
        
        print(f"成功存储 {len(tickets)} 条工单记录到向量数据库")
    
    def _search_similar_documents(self, query: str, k: int = None) -> List[Document]:
        """搜索相似文档"""
        if k is None:
            k = config.TOP_K
            
        # 生成查询向量
        query_vector = self.embeddings.embed_query(query)
        
        # 在 Weaviate 中搜索
        response = self.collection.query.near_vector(
            near_vector=query_vector,
            limit=k,
            return_metadata=wvc.query.MetadataQuery(distance=True)
        )
        
        # 转换为 Document 格式
        documents = []
        for obj in response.objects:
            doc = Document(
                page_content=obj.properties['content'],
                metadata={
                    'ticket_id': obj.properties.get('ticket_id', ''),
                    'issue_type': obj.properties.get('issue_type', ''),
                    'priority': obj.properties.get('priority', ''),
                    'status': obj.properties.get('status', ''),
                    'distance': obj.metadata.distance if obj.metadata else None
                }
            )
            documents.append(doc)
        
        return documents
    
    def _setup_qa_chain(self):
        """设置问答链"""
        # 使用LCEL创建智能问答链
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)
        
        def retrieve_and_format(question):
            docs = self._search_similar_documents(question)
            return format_docs(docs)
        
        self.qa_chain = (
            {"context": retrieve_and_format, "question": RunnablePassthrough()}
            | self.prompt_template
            | self.llm
            | StrOutputParser()
        )
        
        return self.qa_chain
    
    def ask(self, question: str) -> Dict:
        """
        完整的智能问答流程。
        
        返回格式:
        {
            "code": 0,
            "msg": "success",
            "data": {
                "answer": "答案文本",
                "sources": [...],  # 来源工单
                "metadata": {      # 元数据
                    "query_time": 2.3,
                    "retrieved_docs": 5,
                    "model": "llama3.2:latest"
                }
            }
        }
        """
        print("\n" + "=" * 60)
        print(f"客服问题: {question}")
        print("=" * 60)
        
        start_time = time.time()
        
        try:
            # 参数验证
            if not question or not question.strip():
                return error_response(
                    code=AgentErrorCode.QUESTION_FORMAT_ERROR,
                    msg="问题不能为空"
                )
            
            # 设置问答链
            qa_chain = self._setup_qa_chain()
            
            # 先获取相关文档
            try:
                source_docs = self._search_similar_documents(question)
            except Exception as e:
                print(f"检索失败: {e}")
                return error_response(
                    code=AgentErrorCode.RAG_RETRIEVAL_ERROR,
                    msg="向量检索失败",
                    error_detail=str(e)
                )
            
            # 检查是否有相关结果
            if not source_docs:
                return error_response(
                    code=AgentErrorCode.NO_RELEVANT_RESULTS,
                    msg="未找到相关工单记录"
                )
            
            # 显示检索到的相关工单
            print(f"检索到 {len(source_docs)} 条相关工单:")
            sources = []
            for i, doc in enumerate(source_docs, 1):
                metadata = doc.metadata
                ticket_id = metadata.get('ticket_id', 'Unknown')
                issue_type = metadata.get('issue_type', 'Unknown')
                priority = metadata.get('priority', 'Unknown')
                distance = metadata.get('distance')
                
                print(f"  - {ticket_id} ({issue_type}) [优先级: {priority}]")
                
                sources.append({
                    "ticket_id": ticket_id,
                    "issue_type": issue_type,
                    "priority": priority,
                    "status": metadata.get('status', 'Unknown'),
                    "score": 1 - distance if distance else None  # 转换为相似度分数
                })
            
            # 执行问答
            try:
                answer = qa_chain.invoke(question)
            except Exception as e:
                print(f"LLM 调用失败: {e}")
                return error_response(
                    code=AgentErrorCode.LLM_CALL_ERROR,
                    msg="AI 模型调用失败",
                    error_detail=str(e)
                )
            
            # 计算处理时间
            query_time = round(time.time() - start_time, 2)
            
            print("=" * 60)
            print(f"AI 回答: {answer}")
            print(f"处理时间: {query_time}秒")
            print("=" * 60)
            
            # 返回成功响应
            return success_response(
                answer=answer,
                sources=sources[:5],  # 只返回前5个来源
                metadata={
                    "query_time": query_time,
                    "retrieved_docs": len(source_docs),
                    "model": self.chat_model,
                    "embed_model": self.embed_model
                }
            )
            
        except Exception as e:
            error_msg = f"问答过程出错: {e}"
            print(error_msg)
            return error_response(
                code=AgentErrorCode.AGENT_ERROR,
                msg="Agent 服务错误",
                error_detail=str(e)
            )
    
    
    async def ask_stream(self, question: str):
        """
        流式问答，逐 token 返回答案。
        
        Args:
            question: 客服问题
            
        Yields:
            dict: 流式事件，格式:
            {
                "type": "thinking" | "sources" | "token" | "done" | "error",
                "data": {...}
            }
        """
        print("\n" + "=" * 60)
        print(f"客服问题 (流式): {question}")
        print("=" * 60)
        
        start_time = time.time()
        
        try:
            # 参数验证
            if not question or not question.strip():
                yield {
                    "type": "error",
                    "data": {
                        "code": AgentErrorCode.QUESTION_FORMAT_ERROR,
                        "msg": "问题不能为空"
                    }
                }
                return
            
            # 发送思考状态
            yield {
                "type": "thinking",
                "data": {"status": "retrieving", "message": "正在检索相关工单..."}
            }
            
            # 先获取相关文档
            try:
                source_docs = self._search_similar_documents(question)
            except Exception as e:
                print(f"检索失败: {e}")
                yield {
                    "type": "error",
                    "data": {
                        "code": AgentErrorCode.RAG_RETRIEVAL_ERROR,
                        "msg": "向量检索失败",
                        "error_detail": str(e)
                    }
                }
                return
            
            # 检查是否有相关结果
            if not source_docs:
                yield {
                    "type": "error",
                    "data": {
                        "code": AgentErrorCode.NO_RELEVANT_RESULTS,
                        "msg": "未找到相关工单记录"
                    }
                }
                return
            
            # 发送检索到的来源
            sources = []
            for doc in source_docs:
                metadata = doc.metadata
                sources.append({
                    "ticket_id": metadata.get('ticket_id', 'Unknown'),
                    "issue_type": metadata.get('issue_type', 'Unknown'),
                    "priority": metadata.get('priority', 'Unknown'),
                    "status": metadata.get('status', 'Unknown'),
                    "score": 1 - metadata.get('distance', 0) if metadata.get('distance') else None
                })
            
            yield {
                "type": "sources",
                "data": {
                    "sources": sources[:5],
                    "count": len(source_docs)
                }
            }
            
            print(f"检索到 {len(source_docs)} 条相关工单")
            
            # 发送生成状态
            yield {
                "type": "thinking",
                "data": {"status": "generating", "message": "正在生成解决方案..."}
            }
            
            # 设置问答链
            qa_chain = self._setup_qa_chain()
            
            # 流式执行问答
            try:
                full_answer = ""
                async for chunk in qa_chain.astream(question):
                    # chunk 可能是字符串或其他类型
                    if isinstance(chunk, str):
                        token = chunk
                    else:
                        token = str(chunk)
                    
                    full_answer += token
                    
                    # 发送 token
                    yield {
                        "type": "token",
                        "data": {"token": token}
                    }
                
                # 计算处理时间
                query_time = round(time.time() - start_time, 2)
                
                print("=" * 60)
                print(f"AI 回答: {full_answer}")
                print(f"处理时间: {query_time}秒")
                print("=" * 60)
                
                # 发送完成事件
                yield {
                    "type": "done",
                    "data": {
                        "answer": full_answer,
                        "metadata": {
                            "query_time": query_time,
                            "retrieved_docs": len(source_docs),
                            "model": self.chat_model,
                            "embed_model": self.embed_model
                        }
                    }
                }
                
            except Exception as e:
                print(f"LLM 流式调用失败: {e}")
                yield {
                    "type": "error",
                    "data": {
                        "code": AgentErrorCode.LLM_CALL_ERROR,
                        "msg": "AI 模型调用失败",
                        "error_detail": str(e)
                    }
                }
                
        except Exception as e:
            error_msg = f"流式问答过程出错: {e}"
            print(error_msg)
            yield {
                "type": "error",
                "data": {
                    "code": AgentErrorCode.AGENT_ERROR,
                    "msg": "Agent 服务错误",
                    "error_detail": str(e)
                }
            }
    
    
    def close(self):
        """关闭 Weaviate 连接"""
        if hasattr(self, 'client') and self.client:
            self.client.close()
