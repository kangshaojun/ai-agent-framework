# 向量数据库Weaviate：语义搜索的底层原理

## 前言

向量数据库是RAG系统的核心。本文深入讲解Weaviate的工作原理和使用方法。

**适合读者：** AI工程师、数据工程师

---

## 一、向量搜索原理

```
文本 → Embedding模型 → 向量（768维数组）

相似度计算：
- 余弦相似度
- 欧氏距离
- 点积

示例：
"苹果" → [0.89, 0.72, 0.91, ...]
"橙子" → [0.71, 0.73, 0.82, ...]
余弦相似度 = 0.92（非常相似）
```

---

## 二、Weaviate Schema设计

```python
import weaviate

client = weaviate.Client("http://localhost:8080")

schema = {
    "class": "ServiceTicket",
    "vectorizer": "none",  # 使用外部Embedding
    "properties": [
        {
            "name": "ticket_id",
            "dataType": ["string"]
        },
        {
            "name": "title",
            "dataType": ["text"]
        },
        {
            "name": "content",
            "dataType": ["text"]
        },
        {
            "name": "category",
            "dataType": ["string"]
        }
    ]
}

client.schema.create_class(schema)
```

---

## 三、数据导入

```python
from langchain_community.embeddings import OllamaEmbeddings

embeddings = OllamaEmbeddings(model="nomic-embed-text")

# 批量导入
with client.batch as batch:
    for doc in documents:
        # 生成向量
        vector = embeddings.embed_query(doc['content'])
        
        # 添加对象
        batch.add_data_object(
            {
                "ticket_id": doc['ticket_id'],
                "title": doc['title'],
                "content": doc['content'],
                "category": doc['category']
            },
            "ServiceTicket",
            vector=vector
        )
```

---

## 四、向量检索

```python
# 1. 向量搜索
query = "如何重置密码"
query_vector = embeddings.embed_query(query)

result = client.query.get(
    "ServiceTicket",
    ["ticket_id", "title", "content"]
).with_near_vector({
    "vector": query_vector
}).with_limit(5).do()

# 2. 混合搜索（向量+关键词）
result = client.query.get(
    "ServiceTicket",
    ["ticket_id", "title", "content"]
).with_hybrid(
    query=query,
    alpha=0.5  # 0=纯关键词，1=纯向量
).with_limit(5).do()

# 3. 过滤搜索
result = client.query.get(
    "ServiceTicket",
    ["ticket_id", "title", "content"]
).with_near_vector({
    "vector": query_vector
}).with_where({
    "path": ["category"],
    "operator": "Equal",
    "valueString": "账号管理"
}).with_limit(5).do()
```

---

## 五、性能优化

```python
# HNSW索引配置
schema = {
    "class": "ServiceTicket",
    "vectorIndexConfig": {
        "ef": 200,              # 提高召回率
        "efConstruction": 256,  # 构建时的精度
        "maxConnections": 64    # 每个节点的最大连接数
    }
}
```

**下一篇预告：** 《Embedding技术详解：文本如何变成数字向量》
