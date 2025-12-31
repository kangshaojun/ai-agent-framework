# 客服工单系统实战（一）：CSV数据导入与向量化存储

## 前言

本文是客服工单系统实战系列的第一篇，将详细介绍如何将CSV格式的历史工单数据导入到向量数据库Weaviate中，为后续的智能问答打下基础。

**本系列基于真实项目代码**，所有示例均可在GitHub仓库中找到对应实现。

**适合读者：** AI工程师、数据工程师、后端开发者

---

## 一、项目背景

### 1.1 业务场景

客服团队每天处理大量工单，积累了丰富的问题解决经验。传统方式下，客服人员需要手动搜索历史工单，效率低下。通过构建RAG系统，可以：

- ✅ **快速检索**：秒级找到相似历史工单
- ✅ **智能推荐**：自动推荐解决方案
- ✅ **知识沉淀**：历史经验可复用
- ✅ **降低成本**：减少重复劳动

### 1.2 数据结构

我们的工单数据（`service_tickets.csv`）包含以下字段：

```csv
ticket_id,customer_name,issue_type,description,solution,status,priority,create_date,resolve_date,agent,satisfaction
TK001,张先生,产品咨询,咨询笔记本电脑的配置信息...,详细介绍了该型号的配置参数...,已解决,低,2024-11-15,2024-11-15,李明,5
```

**核心字段说明：**
- `ticket_id`：工单唯一标识
- `issue_type`：问题类型（产品咨询、订单查询、技术支持、退换货、账户问题、物流问题、优惠活动）
- `description`：客户问题描述
- `solution`：解决方案（最重要的字段）
- `priority`：优先级（高、中、低）
- `satisfaction`：客户满意度（1-5分）

---

## 二、技术架构

### 2.1 整体流程

```
CSV数据 → Pandas清洗 → 文本组装 → Ollama向量化 → Weaviate存储
```

### 2.2 技术栈

| 组件 | 作用 | 版本 |
|------|------|------|
| **Pandas** | 数据清洗和处理 | 2.0+ |
| **Ollama** | 文本向量化（nomic-embed-text） | - |
| **Weaviate** | 向量数据库 | 1.27.1 |
| **LangChain** | 向量化工具封装 | 0.1.0+ |

---

## 三、数据导入模块实现

### 3.1 项目结构

```
agent/
├── agent/
│   ├── __init__.py
│   ├── config.py          # 配置文件
│   ├── import_data.py     # 数据导入模块（本文重点）
│   └── ticket_agent.py    # Agent主逻辑
├── data/
│   └── service_tickets.csv  # 工单数据
└── http_service.py        # HTTP服务
```

### 3.2 配置文件

```python
# agent/config.py
import os

# Ollama配置
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
EMBED_MODEL = "nomic-embed-text"  # 向量化模型
CHAT_MODEL = "llama3.2:latest"    # 对话模型

# Weaviate配置
WEAVIATE_URL = os.getenv("WEAVIATE_URL", "http://localhost:8080")
WEAVIATE_CLASS = "ServiceTicket"  # 集合名称

# 数据路径
DATA_PATH = "data/service_tickets.csv"

# RAG配置
TOP_K = 5  # 检索Top-K个相似工单

# Prompt模板
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

### 3.3 数据导入类

```python
# agent/import_data.py
import pandas as pd
import ollama
from typing import List, Dict
from tqdm import tqdm
from . import config


class TicketImportData:
    """客服工单数据导入器"""
    
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.embed_model = config.EMBED_MODEL
    
    def load_and_prepare(self) -> List[Dict]:
        """加载CSV数据并准备向量化"""
        print("📂 加载客服工单数据...")
        df = pd.read_csv(self.csv_path, encoding='utf-8')
        print(f"✅ 成功加载 {len(df)} 条工单记录")
        
        # 数据清洗
        df = self._clean_data(df)
        
        tickets = []
        print("🔧 准备工单数据...")
        for _, row in tqdm(df.iterrows(), total=len(df), desc="处理工单"):
            # 构建用于向量化的文本描述
            text = self._build_text_description(row)
            
            tickets.append({
                'id': str(row['ticket_id']),
                'text': text,
                'metadata': {
                    'ticket_id': str(row['ticket_id']),
                    'customer_name': row['customer_name'],
                    'issue_type': row['issue_type'],
                    'description': row['description'],
                    'solution': row['solution'],
                    'status': row['status'],
                    'priority': row['priority'],
                    'agent': row['agent'],
                    'satisfaction': float(row['satisfaction']) if pd.notna(row['satisfaction']) else 0.0
                }
            })
        
        print(f"✅ 准备完成 {len(tickets)} 条工单数据")
        return tickets
    
    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """数据清洗"""
        print("🧹 开始数据清洗...")
        
        original_count = len(df)
        
        # 1. 删除重复数据
        df = df.drop_duplicates(subset=['ticket_id'])
        
        # 2. 删除关键字段缺失的行
        df = df.dropna(subset=['ticket_id', 'issue_type', 'description', 'solution'])
        
        # 3. 填充可选字段的缺失值
        df['customer_name'] = df['customer_name'].fillna('未知客户')
        df['status'] = df['status'].fillna('已解决')
        df['priority'] = df['priority'].fillna('中')
        df['agent'] = df['agent'].fillna('未知客服')
        
        cleaned_count = len(df)
        removed_count = original_count - cleaned_count
        
        if removed_count > 0:
            print(f"⚠️  已删除 {removed_count} 条无效数据")
        
        print(f"✅ 数据清洗完成，保留 {cleaned_count} 条有效数据")
        return df
    
    def _build_text_description(self, row) -> str:
        """构建工单的文本描述用于向量化"""
        # 构建丰富的文本描述，突出问题和解决方案
        description = f"""
工单编号: {row['ticket_id']}
问题类型: {row['issue_type']}
优先级: {row['priority']}
状态: {row['status']}

问题描述:
{row['description']}

解决方案:
{row['solution']}

处理客服: {row['agent']}
客户满意度: {row['satisfaction'] if pd.notna(row['satisfaction']) else '未评价'}
        """.strip()
        
        return description
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """批量生成文本向量"""
        print(f"🔢 正在生成 {len(texts)} 个文本的向量...")
        embeddings = []
        
        for i, text in enumerate(tqdm(texts, desc="生成向量")):
            try:
                # 调用Ollama生成向量
                response = ollama.embeddings(
                    model=self.embed_model,
                    prompt=text
                )
                embeddings.append(response['embedding'])
            except Exception as e:
                print(f"❌ 向量生成失败: {e}")
                # 使用零向量作为fallback
                embeddings.append([0.0] * 768)  # nomic-embed-text维度为768
        
        print("✅ 向量生成完成")
        return embeddings
```

---

## 四、Weaviate存储实现

### 4.1 创建Schema

```python
# agent/ticket_agent.py（部分代码）
import weaviate
import weaviate.classes as wvc
from langchain_community.embeddings import OllamaEmbeddings

class ServiceTicketAgent:
    def __init__(self):
        # 连接Weaviate
        self.client = weaviate.connect_to_local(
            host="localhost",
            port=8080,
            grpc_port=50051
        )
        
        # 初始化Embedding模型
        self.embeddings = OllamaEmbeddings(
            model="nomic-embed-text",
            base_url="http://localhost:11434"
        )
        
        # 构建数据库
        self._build_database()
    
    def _build_database(self):
        """构建向量数据库"""
        print("🏗️  开始构建向量数据库...")
        
        # 1. 加载和准备数据
        loader = TicketImportData("data/service_tickets.csv")
        tickets = loader.load_and_prepare()
        
        # 2. 创建Weaviate集合
        self.collection = self.client.collections.create(
            name="ServiceTicket",
            properties=[
                wvc.config.Property(name="content", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="ticket_id", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="issue_type", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="priority", data_type=wvc.config.DataType.TEXT),
                wvc.config.Property(name="status", data_type=wvc.config.DataType.TEXT),
            ]
        )
        
        # 3. 批量插入数据
        print("📥 开始插入数据到Weaviate...")
        for ticket in tqdm(tickets, desc="插入数据"):
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
        
        print(f"✅ 成功存储 {len(tickets)} 条工单记录到向量数据库")
```

### 4.2 验证数据导入

```python
# 验证脚本
def verify_import():
    """验证数据导入是否成功"""
    client = weaviate.connect_to_local()
    collection = client.collections.get("ServiceTicket")
    
    # 统计总数
    response = collection.aggregate.over_all(total_count=True)
    print(f"📊 数据库中共有 {response.total_count} 条工单")
    
    # 查询示例
    results = collection.query.fetch_objects(limit=3)
    print("\n📝 示例工单：")
    for obj in results.objects:
        print(f"  - {obj.properties['ticket_id']}: {obj.properties['issue_type']}")
    
    client.close()

if __name__ == "__main__":
    verify_import()
```

---

## 五、完整运行流程

### 5.1 环境准备

```bash
# 1. 启动Weaviate
docker run -d \
  --name weaviate \
  -p 8080:8080 \
  -p 50051:50051 \
  semitechnologies/weaviate:1.27.1

# 2. 启动Ollama
ollama serve

# 3. 下载模型
ollama pull nomic-embed-text
ollama pull llama3.2:latest

# 4. 安装依赖
pip install -r requirements.txt
```

### 5.2 执行导入

```python
# test_import.py
from agent import ServiceTicketAgent

if __name__ == "__main__":
    print("开始构建客服工单知识库...")
    
    # 初始化Agent（会自动导入数据）
    agent = ServiceTicketAgent()
    
    print("\n知识库构建完成！")
    print("可以开始进行智能问答了。")
```

**运行输出：**
```
📂 加载客服工单数据...
✅ 成功加载 27 条工单记录
🧹 开始数据清洗...
✅ 数据清洗完成，保留 27 条有效数据
🔧 准备工单数据...
处理工单: 100%|████████████| 27/27 [00:00<00:00, 1234.56it/s]
✅ 准备完成 27 条工单数据
🏗️  开始构建向量数据库...
📥 开始插入数据到Weaviate...
插入数据: 100%|████████████| 27/27 [00:15<00:00,  1.75it/s]
✅ 成功存储 27 条工单记录到向量数据库

知识库构建完成！
```

---

## 六、性能优化

### 6.1 批量向量化

```python
def batch_embed(texts: List[str], batch_size: int = 10) -> List[List[float]]:
    """批量生成向量，提升性能"""
    embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        # 批量调用Ollama
        batch_embeddings = []
        for text in batch:
            response = ollama.embeddings(model="nomic-embed-text", prompt=text)
            batch_embeddings.append(response['embedding'])
        embeddings.extend(batch_embeddings)
    
    return embeddings
```

### 6.2 增量更新

```python
def incremental_update(new_tickets: List[Dict]):
    """增量更新工单数据"""
    collection = client.collections.get("ServiceTicket")
    
    for ticket in new_tickets:
        # 检查是否已存在
        existing = collection.query.fetch_objects(
            filters=wvc.query.Filter.by_property("ticket_id").equal(ticket['ticket_id'])
        )
        
        if existing.objects:
            # 更新
            collection.data.update(
                uuid=existing.objects[0].uuid,
                properties={"content": ticket['text'], ...}
            )
        else:
            # 插入
            vector = embeddings.embed_query(ticket['text'])
            collection.data.insert(properties={...}, vector=vector)
```

---

## 七、常见问题

### 7.1 向量维度不匹配

**问题：** `Vector dimension mismatch`

**解决：** 确保使用相同的Embedding模型，`nomic-embed-text`的维度是768

### 7.2 Weaviate连接失败

**问题：** `Connection refused`

**解决：**
```bash
# 检查Weaviate是否运行
docker ps | grep weaviate

# 检查端口是否被占用
lsof -i :8080
```

### 7.3 中文乱码

**问题：** CSV读取中文乱码

**解决：**
```python
df = pd.read_csv("service_tickets.csv", encoding='utf-8')
# 或者
df = pd.read_csv("service_tickets.csv", encoding='gbk')
```

---

## 八、总结

本文介绍了客服工单系统的数据导入流程：

✅ **CSV数据加载** - Pandas读取和清洗  
✅ **文本组装** - 构建结构化描述  
✅ **向量化** - Ollama nomic-embed-text  
✅ **存储** - Weaviate向量数据库  
✅ **验证** - 数据完整性检查  

**下一篇预告：** 《客服工单系统实战（二）：RAG检索与智能问答》

我们将介绍如何基于已导入的向量数据，实现智能检索和问答功能。

---

**作者简介：** 资深开发者，创业者。专注于视频通讯技术领域。国内首本Flutter著作《Flutter技术入门与实战》作者,另著有《Dart语言实战》及《WebRTC音视频开发》等书籍。多年从事视频会议、远程教育等技术研发，对于Android、iOS以及跨平台开发技术有比较深入的研究和应用，作为主要程序员开发了多个应用项目，涉及医疗、交通、银行等领域。

**学习资料：**
- [项目地址](https://github.com/kangshaojun/ai-agent-framework)
- [作者GitHub](https://github.com/kangshaojun)

**欢迎交流：** 如有问题欢迎在评论区讨论 🚀
