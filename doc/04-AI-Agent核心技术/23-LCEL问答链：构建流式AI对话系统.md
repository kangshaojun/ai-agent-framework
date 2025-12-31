# LCEL问答链：构建流式AI对话系统

## 前言

LCEL（LangChain Expression Language）是LangChain的核心，让构建AI链变得简单优雅。

**适合读者：** AI工程师、后端开发者

---

## 一、LCEL基础

```python
from langchain.prompts import PromptTemplate
from langchain_community.llms import Ollama
from langchain.schema.output_parser import StrOutputParser

# 1. 创建组件
prompt = PromptTemplate.from_template("请用{language}回答：{question}")
llm = Ollama(model="qwen2.5:7b")
output_parser = StrOutputParser()

# 2. 组装链（使用管道操作符）
chain = prompt | llm | output_parser

# 3. 执行
result = chain.invoke({"language": "中文", "question": "什么是RAG？"})
```

---

## 二、RAG链

```python
from langchain.schema.runnable import RunnablePassthrough

# 创建RAG链
rag_chain = (
    {
        "context": vectorstore.as_retriever() | format_docs,
        "question": RunnablePassthrough()
    }
    | prompt
    | llm
    | StrOutputParser()
)

def format_docs(docs):
    return "\n\n".join([doc.page_content for doc in docs])

# 使用
answer = rag_chain.invoke("如何重置密码？")
```

---

## 三、流式执行

```python
# 同步流式
for chunk in rag_chain.stream("如何重置密码？"):
    print(chunk, end="", flush=True)

# 异步流式
async for chunk in rag_chain.astream("如何重置密码？"):
    print(chunk, end="", flush=True)
```

---

## 四、批量执行

```python
questions = [
    "如何重置密码？",
    "如何修改邮箱？",
    "如何注销账号？"
]

# 批量执行
answers = rag_chain.batch(questions)
```

---

## 五、完整示例

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.post("/chat/stream")
async def chat_stream(question: str):
    async def event_generator():
        async for chunk in rag_chain.astream(question):
            yield f"data: {chunk}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

**下一篇预告：** 《Docker容器化：一键部署完整AI系统》
