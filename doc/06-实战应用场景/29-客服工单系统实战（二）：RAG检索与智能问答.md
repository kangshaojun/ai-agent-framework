# 客服工单系统实战（二）：RAG检索与智能问答

## 前言

在上一篇文章中，我们完成了工单数据的导入和向量化存储。本文将介绍如何基于这些向量数据，实现智能检索和问答功能，让AI能够根据历史工单自动推荐解决方案。

**本文基于真实项目代码**，所有示例均可在GitHub仓库中找到对应实现。

**适合读者：** AI工程师、后端开发者、全栈工程师

---

## 一、RAG工作原理

### 1.1 传统LLM vs RAG

```
传统LLM：
用户问题 → LLM → 答案
问题：知识有限、可能过时、容易幻觉

RAG（检索增强生成）：
用户问题 → 向量检索 → 相关工单 → 组装Prompt → LLM → 答案
优势：知识可更新、答案更准确、有据可查
```

### 1.2 完整流程

```
1. 用户提问："物流信息5天没更新怎么办？"
   ↓
2. 向量化问题 → [0.23, -0.45, 0.67, ...]
   ↓
3. Weaviate检索 → Top-5相似工单
   ↓
4. 组装Prompt（问题 + 历史工单）
   ↓
5. LLM生成答案
   ↓
6. 返回答案 + 来源工单
```

---

## 二、向量检索实现

### 2.1 相似度搜索

```python
# agent/ticket_agent.py
from langchain_core.documents import Document
import weaviate.classes as wvc

class ServiceTicketAgent:
    def _search_similar_documents(self, query: str, k: int = 5) -> List[Document]:
        """搜索相似工单"""
        # 1. 生成查询向量
        query_vector = self.embeddings.embed_query(query)
        
        # 2. 在Weaviate中搜索
        response = self.collection.query.near_vector(
            near_vector=query_vector,
            limit=k,
            return_metadata=wvc.query.MetadataQuery(distance=True)
        )
        
        # 3. 转换为Document格式
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
```

### 2.2 检索测试

```python
# 测试检索功能
def test_search():
    agent = ServiceTicketAgent()
    
    # 测试问题
    question = "物流信息5天没更新，怎么处理？"
    
    # 检索相似工单
    docs = agent._search_similar_documents(question, k=5)
    
    print(f"检索到 {len(docs)} 条相关工单：\n")
    for i, doc in enumerate(docs, 1):
        print(f"工单 {i}:")
        print(f"  ID: {doc.metadata['ticket_id']}")
        print(f"  类型: {doc.metadata['issue_type']}")
        print(f"  距离: {doc.metadata['distance']:.4f}")
        print(f"  内容: {doc.page_content[:100]}...")
        print()

if __name__ == "__main__":
    test_search()
```

**输出示例：**
```
检索到 5 条相关工单：

工单 1:
  ID: TK011
  类型: 订单查询
  距离: 0.1234
  内容: 工单编号: TK011
问题类型: 订单查询
问题描述: 订单已发货5天但物流信息未更新，担心包裹丢失...

工单 2:
  ID: TK006
  类型: 物流问题
  距离: 0.2456
  内容: 工单编号: TK006
问题类型: 物流问题
问题描述: 快递显示已签收但本人未收到货物...
```

---

## 三、Prompt工程

### 3.1 Prompt模板设计

```python
# agent/config.py
QA_PROMPT_TEMPLATE = """你是一个专业的客服助手，擅长根据历史工单提供解决方案。

以下是相关的历史工单记录：

{context}

客户问题：{question}

请基于以上历史工单，为客户提供专业的解决方案。要求：
1. 如果找到相关解决方案，请详细说明处理步骤
2. 如果历史工单中没有完全匹配的案例，可以综合多个相似案例给出建议
3. 保持友好、专业的语气
4. 如果确实无法解决，建议客户联系人工客服

回答："""
```

### 3.2 动态Prompt组装

```python
from langchain_core.prompts import PromptTemplate

class ServiceTicketAgent:
    def _setup_components(self):
        # 初始化Prompt模板
        self.prompt_template = PromptTemplate(
            input_variables=["context", "question"],
            template=config.QA_PROMPT_TEMPLATE
        )
    
    def _format_context(self, docs: List[Document]) -> str:
        """格式化上下文"""
        context_parts = []
        
        for i, doc in enumerate(docs, 1):
            context_parts.append(f"【历史工单 {i}】\n{doc.page_content}")
        
        return "\n\n".join(context_parts)
```

---

## 四、LCEL问答链

### 4.1 构建问答链

```python
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

class ServiceTicketAgent:
    def _setup_qa_chain(self):
        """设置问答链（LCEL）"""
        
        # 定义格式化函数
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)
        
        # 定义检索和格式化函数
        def retrieve_and_format(question):
            docs = self._search_similar_documents(question)
            return format_docs(docs)
        
        # 使用LCEL构建链
        self.qa_chain = (
            {
                "context": retrieve_and_format,
                "question": RunnablePassthrough()
            }
            | self.prompt_template
            | self.llm
            | StrOutputParser()
        )
        
        return self.qa_chain
```

### 4.2 LCEL优势

```python
# LCEL的优势：
# 1. 简洁优雅 - 使用管道操作符 |
# 2. 类型安全 - 自动类型检查
# 3. 流式支持 - 天然支持stream
# 4. 并行执行 - 自动优化执行顺序

# 传统方式（复杂）
def old_way(question):
    docs = search(question)
    context = format(docs)
    prompt = template.format(context=context, question=question)
    answer = llm.invoke(prompt)
    return parse(answer)

# LCEL方式（简洁）
chain = retriever | format | prompt | llm | parser
answer = chain.invoke(question)
```

---

## 五、非流式问答

### 5.1 完整实现

```python
# agent/ticket_agent.py
import time
from .response import success_response, error_response, AgentErrorCode

class ServiceTicketAgent:
    def ask(self, question: str) -> Dict:
        """
        完整的智能问答流程
        
        返回格式:
        {
            "code": 0,
            "msg": "success",
            "data": {
                "answer": "答案文本",
                "sources": [...],
                "metadata": {...}
            }
        }
        """
        print("\n" + "=" * 60)
        print(f"客服问题: {question}")
        print("=" * 60)
        
        start_time = time.time()
        
        try:
            # 1. 参数验证
            if not question or not question.strip():
                return error_response(
                    code=AgentErrorCode.QUESTION_FORMAT_ERROR,
                    msg="问题不能为空"
                )
            
            # 2. 设置问答链
            qa_chain = self._setup_qa_chain()
            
            # 3. 检索相关工单
            try:
                source_docs = self._search_similar_documents(question)
            except Exception as e:
                return error_response(
                    code=AgentErrorCode.RAG_RETRIEVAL_ERROR,
                    msg="向量检索失败",
                    error_detail=str(e)
                )
            
            # 4. 检查是否有相关结果
            if not source_docs:
                return error_response(
                    code=AgentErrorCode.NO_RELEVANT_RESULTS,
                    msg="未找到相关工单记录"
                )
            
            # 5. 显示检索到的工单
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
                    "score": 1 - distance if distance else None
                })
            
            # 6. 执行问答
            try:
                answer = qa_chain.invoke(question)
            except Exception as e:
                return error_response(
                    code=AgentErrorCode.LLM_CALL_ERROR,
                    msg="AI 模型调用失败",
                    error_detail=str(e)
                )
            
            # 7. 计算处理时间
            query_time = round(time.time() - start_time, 2)
            
            print("=" * 60)
            print(f"AI 回答: {answer}")
            print(f"处理时间: {query_time}秒")
            print("=" * 60)
            
            # 8. 返回成功响应
            return success_response(
                answer=answer,
                sources=sources[:5],
                metadata={
                    "query_time": query_time,
                    "retrieved_docs": len(source_docs),
                    "model": self.chat_model,
                    "embed_model": self.embed_model
                }
            )
            
        except Exception as e:
            return error_response(
                code=AgentErrorCode.AGENT_ERROR,
                msg="Agent 服务错误",
                error_detail=str(e)
            )
```

### 5.2 测试问答

```python
# test_qa.py
from agent import ServiceTicketAgent

def test_qa():
    agent = ServiceTicketAgent()
    
    # 测试问题列表
    questions = [
        "物流信息5天没更新，怎么处理？",
        "客户想退货，如何操作？",
        "忘记密码怎么办？",
        "笔记本电脑可以升级内存吗？"
    ]
    
    for question in questions:
        print(f"\n{'='*60}")
        print(f"问题: {question}")
        print('='*60)
        
        result = agent.ask(question)
        
        if result['code'] == 0:
            data = result['data']
            print(f"\n答案:\n{data['answer']}")
            print(f"\n参考工单: {len(data['sources'])}条")
            print(f"处理时间: {data['metadata']['query_time']}秒")
        else:
            print(f"错误: {result['msg']}")

if __name__ == "__main__":
    test_qa()
```

---

## 六、流式问答

### 6.1 流式实现

```python
class ServiceTicketAgent:
    async def ask_stream(self, question: str):
        """
        流式问答，逐token返回答案
        
        Yields:
            dict: 流式事件
            {
                "type": "thinking" | "sources" | "token" | "done" | "error",
                "data": {...}
            }
        """
        start_time = time.time()
        
        try:
            # 1. 发送思考状态
            yield {
                "type": "thinking",
                "data": {"status": "retrieving", "message": "正在检索相关工单..."}
            }
            
            # 2. 检索相关工单
            source_docs = self._search_similar_documents(question)
            
            if not source_docs:
                yield {
                    "type": "error",
                    "data": {"code": 2001, "msg": "未找到相关工单记录"}
                }
                return
            
            # 3. 发送检索结果
            sources = []
            for doc in source_docs:
                metadata = doc.metadata
                sources.append({
                    "ticket_id": metadata.get('ticket_id', 'Unknown'),
                    "issue_type": metadata.get('issue_type', 'Unknown'),
                    "priority": metadata.get('priority', 'Unknown'),
                    "score": 1 - metadata.get('distance', 0)
                })
            
            yield {
                "type": "sources",
                "data": {"sources": sources[:5], "count": len(source_docs)}
            }
            
            # 4. 发送生成状态
            yield {
                "type": "thinking",
                "data": {"status": "generating", "message": "正在生成解决方案..."}
            }
            
            # 5. 设置问答链
            qa_chain = self._setup_qa_chain()
            
            # 6. 流式执行问答
            full_answer = ""
            async for chunk in qa_chain.astream(question):
                token = str(chunk) if not isinstance(chunk, str) else chunk
                full_answer += token
                
                # 发送token
                yield {
                    "type": "token",
                    "data": {"token": token}
                }
            
            # 7. 发送完成事件
            query_time = round(time.time() - start_time, 2)
            
            yield {
                "type": "done",
                "data": {
                    "answer": full_answer,
                    "metadata": {
                        "query_time": query_time,
                        "retrieved_docs": len(source_docs),
                        "model": self.chat_model
                    }
                }
            }
            
        except Exception as e:
            yield {
                "type": "error",
                "data": {"code": 2000, "msg": "Agent服务错误", "error_detail": str(e)}
            }
```

### 6.2 测试流式问答

```python
# test_stream.py
import asyncio

async def test_stream():
    agent = ServiceTicketAgent()
    question = "物流信息5天没更新，怎么处理？"
    
    print(f"问题: {question}\n")
    
    async for event in agent.ask_stream(question):
        event_type = event['type']
        data = event['data']
        
        if event_type == 'thinking':
            print(f"💭 {data['message']}")
        
        elif event_type == 'sources':
            print(f"📚 检索到 {data['count']} 条相关工单")
            for i, source in enumerate(data['sources'], 1):
                print(f"   {i}. {source['ticket_id']} - {source['issue_type']}")
        
        elif event_type == 'token':
            print(data['token'], end='', flush=True)
        
        elif event_type == 'done':
            print(f"\n\n⏱️ 处理时间: {data['metadata']['query_time']}秒")
        
        elif event_type == 'error':
            print(f"❌ 错误: {data['msg']}")

if __name__ == "__main__":
    asyncio.run(test_stream())
```

---

## 七、响应格式设计

### 7.1 统一响应格式

```python
# agent/response.py
from enum import IntEnum

class AgentErrorCode(IntEnum):
    """Agent错误码"""
    SUCCESS = 0
    QUESTION_FORMAT_ERROR = 2001
    RAG_RETRIEVAL_ERROR = 2002
    NO_RELEVANT_RESULTS = 2003
    LLM_CALL_ERROR = 2004
    AGENT_ERROR = 2000

def success_response(answer: str, sources: list, metadata: dict) -> dict:
    """成功响应"""
    return {
        "code": AgentErrorCode.SUCCESS,
        "msg": "success",
        "data": {
            "answer": answer,
            "sources": sources,
            "metadata": metadata
        }
    }

def error_response(code: int, msg: str, error_detail: str = None) -> dict:
    """错误响应"""
    response = {
        "code": code,
        "msg": msg,
        "data": None
    }
    if error_detail:
        response["error_detail"] = error_detail
    return response
```

---

## 八、性能优化

### 8.1 缓存检索结果

```python
from functools import lru_cache

class ServiceTicketAgent:
    @lru_cache(maxsize=100)
    def _cached_search(self, question: str, k: int = 5):
        """缓存检索结果"""
        return tuple(self._search_similar_documents(question, k))
```

### 8.2 批量问答

```python
async def batch_ask(self, questions: List[str]) -> List[Dict]:
    """批量问答"""
    tasks = [self.ask(q) for q in questions]
    return await asyncio.gather(*tasks)
```

---

## 九、评估指标

### 9.1 检索质量评估

```python
def evaluate_retrieval(test_cases: List[Dict]):
    """评估检索质量"""
    agent = ServiceTicketAgent()
    
    metrics = {
        "precision": [],
        "recall": [],
        "mrr": []  # Mean Reciprocal Rank
    }
    
    for case in test_cases:
        question = case['question']
        expected_tickets = set(case['expected_tickets'])
        
        # 检索
        docs = agent._search_similar_documents(question, k=5)
        retrieved_tickets = set([doc.metadata['ticket_id'] for doc in docs])
        
        # 计算指标
        tp = len(expected_tickets & retrieved_tickets)
        precision = tp / len(retrieved_tickets) if retrieved_tickets else 0
        recall = tp / len(expected_tickets) if expected_tickets else 0
        
        metrics['precision'].append(precision)
        metrics['recall'].append(recall)
    
    # 平均值
    return {
        "avg_precision": sum(metrics['precision']) / len(metrics['precision']),
        "avg_recall": sum(metrics['recall']) / len(metrics['recall'])
    }
```

---

## 十、总结

本文介绍了客服工单系统的RAG检索和问答实现：

✅ **向量检索** - Weaviate相似度搜索  
✅ **Prompt工程** - 动态组装上下文  
✅ **LCEL问答链** - 优雅的链式调用  
✅ **流式问答** - 实时打字机效果  
✅ **响应格式** - 统一的错误处理  

**下一篇预告：** 《客服工单系统实战（三）：前后端集成与生产部署》

我们将介绍如何将Agent服务集成到完整的前后端系统中，并部署到生产环境。

---

**作者简介：** 资深开发者，创业者。专注于视频通讯技术领域。国内首本Flutter著作《Flutter技术入门与实战》作者,另著有《Dart语言实战》及《WebRTC音视频开发》等书籍。多年从事视频会议、远程教育等技术研发，对于Android、iOS以及跨平台开发技术有比较深入的研究和应用，作为主要程序员开发了多个应用项目，涉及医疗、交通、银行等领域。

**学习资料：**
- [项目地址](https://github.com/kangshaojun/ai-agent-framework)
- [作者GitHub](https://github.com/kangshaojun)

**欢迎交流：** 如有问题欢迎在评论区讨论 🚀
