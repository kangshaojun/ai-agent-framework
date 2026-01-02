# Docker容器化：一键部署完整AI系统

## 前言

Docker让AI系统的部署变得简单可靠。本文介绍如何使用Docker容器化整个AI Agent框架。

**适合读者：** 运维工程师、后端开发者

---

## 一、Docker Compose配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 前端服务
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - server

  # 后端服务
  server:
    build: ./server
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/aiagent
      - REDIS_URL=redis://redis:6379/0
      - AGENT_URL=http://agent:8001
    depends_on:
      - postgres
      - redis
      - agent

  # AI Agent服务
  agent:
    build: ./agent
    ports:
      - "8001:8001"
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - WEAVIATE_URL=http://weaviate:8080
    depends_on:
      - ollama
      - weaviate

  # PostgreSQL数据库
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=aiagent
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  # Redis缓存
  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Weaviate向量数据库
  weaviate:
    image: semitechnologies/weaviate:1.27.1
    ports:
      - "8080:8080"
    environment:
      - QUERY_DEFAULTS_LIMIT=25
      - AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true
      - PERSISTENCE_DATA_PATH=/var/lib/weaviate
      - DEFAULT_VECTORIZER_MODULE=none
    volumes:
      - weaviate_data:/var/lib/weaviate

  # Ollama LLM服务
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

volumes:
  postgres_data:
  redis_data:
  weaviate_data:
  ollama_data:
```

---

## 二、Dockerfile示例

### 2.1 Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

### 2.2 Server Dockerfile

```dockerfile
# server/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 运行数据库迁移
RUN chmod +x ./deploy/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./deploy/entrypoint.sh"]
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 2.3 Agent Dockerfile

```dockerfile
# agent/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "http_service:app", "--host", "0.0.0.0", "--port", "8001"]
```

---

## 三、启动脚本

```bash
#!/bin/bash
# deploy/start.sh

# 1. 启动所有服务
docker-compose up -d

# 2. 等待数据库就绪
echo "等待数据库启动..."
sleep 10

# 3. 运行数据库迁移
docker-compose exec server alembic upgrade head

# 4. 下载Ollama模型
docker-compose exec ollama ollama pull qwen2.5:7b
docker-compose exec ollama ollama pull nomic-embed-text

echo "部署完成！"
echo "前端: http://localhost:3000"
echo "后端API: http://localhost:8000/docs"
```

---

## 四、健康检查

```yaml
# docker-compose.yml中添加健康检查
services:
  server:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

## 五、日志管理

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f server

# 查看最近100行日志
docker-compose logs --tail=100 server
```

**下一篇预告：** 《Loguru日志系统：分布式应用的调试利器》
