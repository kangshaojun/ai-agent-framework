# RAG检索增强生成：让AI拥有专业知识

## 前言

RAG让AI能够访问外部知识库，大幅提升回答质量。本文深入讲解RAG的实现原理。

**适合读者：** AI工程师、架构师

---

## 一、RAG vs 传统LLM

```
传统LLM：
问题 → LLM → 答案
问题：知识有限、可能过时

RAG：
问题 → 检索知识库 → 组装Prompt → LLM → 答案
优势：知识可更新、答案更准确
```

---

## 二、RAG完整流程

```python
class RAGEngine:
    def __init__(self, vectorstore, llm):
        self.vectorstore = vectorstore
        self.llm = llm
    
    async def answer(self, question: str):
        # 1. 向量化问题
        query_vector = self.embeddings.embed_query(question)
        
        # 2. 检索相关文档（Top-K）
        docs = self.vectorstore.similarity_search(question, k=5)
        
        # 3. 组装上下文
        context = "\n\n".join([
            f"文档{i+1}:\n{doc.page_content}"
            for i, doc in enumerate(docs)
        ])
        
        # 4. 组装Prompt
        prompt = f"""基于以下上下文回答问题。

上下文：
{context}

问题：{question}

回答："""
        
        # 5. LLM生成答案
        answer = await self.llm.ainvoke(prompt)
        
        return {
            "answer": answer,
            "sources": [doc.metadata for doc in docs]
        }
```

---

## 三、检索策略优化

```python
# 1. 混合检索（向量+关键词）
docs = vectorstore.similarity_search(
    question,
    search_type="hybrid",
    k=5
)

# 2. MMR检索（最大边际相关性）
docs = vectorstore.max_marginal_relevance_search(
    question,
    k=5,
    fetch_k=20  # 先检索20个，再选5个最相关且多样的
)

# 3. 带过滤的检索
docs = vectorstore.similarity_search(
    question,
    k=5,
    filter={"category": "账号管理"}
)
```

---

## 四、Re-ranking

```python
from sentence_transformers import CrossEncoder

class ReRanker:
    def __init__(self):
        self.model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
    
    def rerank(self, question: str, docs: list, top_k: int = 5):
        # 计算相关性分数
        pairs = [[question, doc.page_content] for doc in docs]
        scores = self.model.predict(pairs)
        
        # 排序
        doc_scores = list(zip(docs, scores))
        doc_scores.sort(key=lambda x: x[1], reverse=True)
        
        return [doc for doc, score in doc_scores[:top_k]]

# 使用
reranker = ReRanker()
docs = vectorstore.similarity_search(question, k=20)
top_docs = reranker.rerank(question, docs, top_k=5)
```

---

## 五、流式RAG

```python
async def stream_rag_answer(question: str):
    # 1. 检索文档
    docs = vectorstore.similarity_search(question, k=5)
    
    # 2. 组装Prompt
    context = "\n\n".join([doc.page_content for doc in docs])
    prompt = f"基于以下上下文回答问题：\n\n{context}\n\n问题：{question}\n\n回答："
    
    # 3. 流式生成
    async for chunk in llm.astream(prompt):
        yield chunk
```

**下一篇预告：** 《Pandas数据清洗：为向量化做准备》
