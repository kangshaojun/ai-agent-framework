# LangChain入门：构建你的第一个RAG应用

## 前言

LangChain是构建AI应用的强大框架。本文将带你从零开始构建一个完整的RAG（检索增强生成）应用。

**适合读者：** AI工程师、后端开发者

---

## 一、RAG基础概念

```
RAG = Retrieval Augmented Generation（检索增强生成）

流程：
1. 用户提问
2. 向量化问题
3. 检索相关文档（Top-K）
4. 组装Prompt（问题+文档）
5. LLM生成答案
```

---

## 二、环境准备

```bash
pip install langchain langchain-community ollama weaviate-client
```

---

## 三、数据准备

```python
# data_loader.py
import pandas as pd
from langchain.text_splitter import RecursiveCharacterTextSplitter

# 1. 读取CSV数据
df = pd.read_csv("service_tickets.csv")

# 2. 数据清洗
df = df.dropna()
df['content'] = df['title'] + "\n" + df['description'] + "\n" + df['solution']

# 3. 文本分块
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50
)

documents = []
for _, row in df.iterrows():
    chunks = text_splitter.split_text(row['content'])
    for chunk in chunks:
        documents.append({
            'content': chunk,
            'metadata': {
                'ticket_id': row['ticket_id'],
                'category': row['category']
            }
        })
```

---

## 四、向量化和存储

```python
# vector_store.py
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Weaviate
import weaviate

# 1. 初始化Embedding模型
embeddings = OllamaEmbeddings(
    model="nomic-embed-text",
    base_url="http://localhost:11434"
)

# 2. 连接Weaviate
client = weaviate.Client("http://localhost:8080")

# 3. 创建向量存储
vectorstore = Weaviate(
    client=client,
    index_name="ServiceTickets",
    text_key="content",
    embedding=embeddings
)

# 4. 添加文档
texts = [doc['content'] for doc in documents]
metadatas = [doc['metadata'] for doc in documents]
vectorstore.add_texts(texts, metadatas=metadatas)
```

---

## 五、构建RAG链

```python
# rag_chain.py
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA

# 1. 初始化LLM
llm = Ollama(
    model="qwen2.5:7b",
    base_url="http://localhost:11434",
    temperature=0.7
)

# 2. 创建Prompt模板
prompt_template = """基于以下上下文回答问题。

上下文：
{context}

问题：{question}

回答："""

prompt = PromptTemplate(
    template=prompt_template,
    input_variables=["context", "question"]
)

# 3. 创建RAG链
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),
    chain_type_kwargs={"prompt": prompt}
)

# 4. 使用
answer = qa_chain.run("如何重置密码？")
print(answer)
```

---

## 六、流式生成

```python
# streaming.py
async def stream_answer(question: str):
    # 1. 检索文档
    docs = vectorstore.similarity_search(question, k=5)
    
    # 2. 组装上下文
    context = "\n\n".join([doc.page_content for doc in docs])
    
    # 3. 生成Prompt
    prompt_text = prompt_template.format(context=context, question=question)
    
    # 4. 流式生成
    async for chunk in llm.astream(prompt_text):
        yield chunk
```

---

## 七、完整示例

```python
# main.py
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json

app = FastAPI()

@app.post("/chat/stream")
async def chat_stream(question: str):
    async def event_generator():
        # 1. 思考状态
        yield f"event: thinking\ndata: {json.dumps({'status': 'retrieving'})}\n\n"
        
        # 2. 检索文档
        docs = vectorstore.similarity_search(question, k=5)
        yield f"event: sources\ndata: {json.dumps({'count': len(docs)})}\n\n"
        
        # 3. 流式生成答案
        async for chunk in stream_answer(question):
            yield f"event: token\ndata: {json.dumps({'token': chunk})}\n\n"
        
        # 4. 完成
        yield f"event: done\ndata: {json.dumps({'status': 'completed'})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

**下一篇预告：** 《向量数据库Weaviate：语义搜索的底层原理》
