# Ollama本地部署：llama3.2模型的实战应用

## 前言

Ollama让本地部署大模型变得简单。本文介绍如何使用Ollama部署和使用llama3.2模型。

**适合读者：** AI工程师、运维工程师

---

## 一、安装Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# 启动服务
ollama serve
```

---

## 二、下载模型

```bash
# 下载llama3.2:latest（对话模型）
ollama pull llama3.2:latest

# 下载nomic-embed-text（Embedding模型）
ollama pull nomic-embed-text

# 查看已下载的模型
ollama list
```

---

## 三、命令行使用

```bash
# 交互式对话
ollama run llama3.2:latest

# 单次问答
ollama run llama3.2:latest "什么是RAG？"
```

---

## 四、Python集成

```python
from langchain_community.llms import Ollama

llm = Ollama(
    model="llama3.2:latest",
    base_url="http://localhost:11434",
    temperature=0.7,
    num_ctx=4096  # 上下文长度
)

# 同步调用
response = llm.invoke("介绍一下你自己")
print(response)

# 流式调用
for chunk in llm.stream("讲个笑话"):
    print(chunk, end="", flush=True)

# 异步流式
async for chunk in llm.astream("写一首诗"):
    print(chunk, end="", flush=True)
```

---

## 五、模型配置

```python
# Modelfile
FROM llama3.2:latest

# 设置温度
PARAMETER temperature 0.7

# 设置上下文长度
PARAMETER num_ctx 8192

# 设置系统提示词
SYSTEM """
你是一个专业的客服助手。
请用友好、专业的语气回答用户问题。
"""

# 创建自定义模型
# ollama create my-assistant -f Modelfile
```

---

## 六、性能优化

```bash
# 使用量化模型（减少显存占用）
ollama pull qwen2.5:7b-q4_0

# 设置并发数
export OLLAMA_NUM_PARALLEL=4

# 设置最大加载模型数
export OLLAMA_MAX_LOADED_MODELS=2
```

**下一篇预告：** 《Prompt工程：从模板到动态组装的最佳实践》
