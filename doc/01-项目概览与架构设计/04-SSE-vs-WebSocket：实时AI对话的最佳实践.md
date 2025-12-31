# SSE vs WebSocket：实时AI对话的最佳实践

## 前言

在构建AI对话系统时，选择合适的实时通信协议至关重要。本文将深入对比SSE和WebSocket，并分享我们在生产环境中的实践经验。

**适合读者：** 全栈开发者、后端工程师、架构师

---

## 一、实时通信的需求

### 1.1 AI对话的特点

```
用户发送问题
   ↓
AI开始思考（需要实时反馈）
   ↓
检索知识库（需要显示进度）
   ↓
逐字生成答案（打字机效果）
   ↓
完成回答
```

### 1.2 技术要求

```
✅ 低延迟 - 毫秒级响应
✅ 单向推送 - 服务器→客户端
✅ 流式传输 - 逐Token返回
✅ 自动重连 - 网络断开后恢复
✅ 简单易用 - 降低开发成本
```

---

## 二、SSE vs WebSocket 深度对比

### 2.1 技术对比表

| 特性 | SSE | WebSocket |
|------|-----|-----------|
| **通信方向** | 单向（服务器→客户端） | 双向 |
| **协议** | HTTP/HTTPS | WS/WSS |
| **浏览器支持** | 所有现代浏览器 | 所有现代浏览器 |
| **自动重连** | ✅ 内置 | ❌ 需要手动实现 |
| **消息格式** | 文本（UTF-8） | 文本/二进制 |
| **代理友好** | ✅ 标准HTTP | ❌ 需要特殊配置 |
| **实现复杂度** | ⭐⭐ 简单 | ⭐⭐⭐⭐ 复杂 |
| **适用场景** | 服务器推送、实时通知 | 聊天、游戏、协作 |

### 2.2 连接建立过程

**SSE连接建立：**

```
Client                          Server
  |                               |
  |--- GET /stream HTTP/1.1 ---→ |
  |    Accept: text/event-stream  |
  |                               |
  |←-- HTTP/1.1 200 OK ----------|
  |    Content-Type: text/event-stream
  |    Cache-Control: no-cache   |
  |                               |
  |←------ data: hello ----------|
  |←------ data: world ----------|
  |                               |
```

**WebSocket连接建立：**

```
Client                          Server
  |                               |
  |--- GET /ws HTTP/1.1 --------→|
  |    Upgrade: websocket         |
  |    Connection: Upgrade        |
  |                               |
  |←-- HTTP/1.1 101 Switching ---|
  |    Upgrade: websocket         |
  |    Connection: Upgrade        |
  |                               |
  |←====== WebSocket Frame ======|
  |====== WebSocket Frame ======→|
  |                               |
```

---

## 三、SSE实现详解

### 3.1 服务端实现（FastAPI）

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio
import json

app = FastAPI()

@app.post("/chat/stream")
async def chat_stream(question: str):
    """SSE流式对话接口"""
    
    async def event_generator():
        try:
            # 1. 思考状态
            yield format_sse_message(
                event="thinking",
                data={"status": "retrieving", "message": "正在检索知识库..."}
            )
            await asyncio.sleep(0.5)
            
            # 2. 检索结果
            docs = await search_knowledge_base(question)
            yield format_sse_message(
                event="sources",
                data={"count": len(docs), "sources": [doc.metadata for doc in docs]}
            )
            
            # 3. 流式生成答案
            async for token in llm.astream(question):
                yield format_sse_message(
                    event="token",
                    data={"token": token}
                )
            
            # 4. 完成
            yield format_sse_message(
                event="done",
                data={"status": "completed"}
            )
            
        except Exception as e:
            yield format_sse_message(
                event="error",
                data={"error": str(e)}
            )
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用Nginx缓冲
        }
    )

def format_sse_message(event: str, data: dict) -> str:
    """格式化SSE消息"""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
```

### 3.2 客户端实现（TypeScript）

```typescript
// services/chat.ts
import { fetchEventSource } from '@microsoft/fetch-event-source';

interface StreamCallbacks {
  onThinking?: (data: any) => void;
  onSources?: (data: any) => void;
  onToken?: (token: string) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

export async function sendMessageStream(
  conversationId: string,
  message: string,
  callbacks: StreamCallbacks
) {
  const ctrl = new AbortController();
  
  try {
    await fetchEventSource(`${API_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessToken()}`
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        message: message
      }),
      signal: ctrl.signal,
      
      // 处理不同类型的事件
      onmessage(event) {
        const data = JSON.parse(event.data);
        
        switch (event.event) {
          case 'thinking':
            callbacks.onThinking?.(data);
            break;
          case 'sources':
            callbacks.onSources?.(data);
            break;
          case 'token':
            callbacks.onToken?.(data.token);
            break;
          case 'done':
            callbacks.onDone?.();
            break;
          case 'error':
            callbacks.onError?.(data.error);
            break;
        }
      },
      
      // 错误处理
      onerror(err) {
        console.error('SSE Error:', err);
        ctrl.abort();
        throw err;
      },
      
      // 自动重连
      openWhenHidden: true
    });
  } catch (error) {
    console.error('Stream error:', error);
    throw error;
  }
}
```

### 3.3 React组件使用

```typescript
// components/ChatInterface.tsx
'use client'

import { useState } from 'react'
import { sendMessageStream } from '@/services/chat'

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('')
  
  const handleSend = async (text: string) => {
    // 添加用户消息
    setMessages(prev => [...prev, {
      role: 'user',
      content: text
    }])
    
    // 重置助手消息
    setCurrentAssistantMessage('')
    setIsThinking(true)
    
    try {
      await sendMessageStream(conversationId, text, {
        onThinking: (data) => {
          console.log('思考中:', data.message)
        },
        
        onSources: (data) => {
          console.log('检索到', data.count, '条相关文档')
          setIsThinking(false)
        },
        
        onToken: (token) => {
          // 实时追加Token
          setCurrentAssistantMessage(prev => prev + token)
        },
        
        onDone: () => {
          // 完成，保存消息
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: currentAssistantMessage
          }])
          setCurrentAssistantMessage('')
        },
        
        onError: (error) => {
          console.error('错误:', error)
          setIsThinking(false)
        }
      })
    } catch (error) {
      console.error('发送失败:', error)
    }
  }
  
  return (
    <div className="chat-container">
      {/* 消息列表 */}
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
      
      {/* 实时显示助手回复 */}
      {currentAssistantMessage && (
        <MessageBubble 
          message={{
            role: 'assistant',
            content: currentAssistantMessage
          }}
          isStreaming={true}
        />
      )}
      
      {/* 思考指示器 */}
      {isThinking && <ThinkingIndicator />}
      
      {/* 输入框 */}
      <ChatInput onSend={handleSend} />
    </div>
  )
}
```

---

## 四、WebSocket实现详解

### 4.1 服务端实现（FastAPI）

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict
import json

app = FastAPI()

# 连接管理器
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
    
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
    
    async def send_message(self, client_id: str, message: dict):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_json()
            
            if data['type'] == 'chat':
                # 发送思考状态
                await manager.send_message(client_id, {
                    'type': 'thinking',
                    'data': {'status': 'retrieving'}
                })
                
                # 流式生成答案
                async for token in llm.astream(data['message']):
                    await manager.send_message(client_id, {
                        'type': 'token',
                        'data': {'token': token}
                    })
                
                # 完成
                await manager.send_message(client_id, {
                    'type': 'done',
                    'data': {'status': 'completed'}
                })
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)
```

### 4.2 客户端实现（TypeScript）

```typescript
// services/websocket.ts
export class ChatWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  
  constructor(
    private url: string,
    private callbacks: {
      onMessage: (data: any) => void
      onError: (error: any) => void
      onClose: () => void
    }
  ) {}
  
  connect() {
    this.ws = new WebSocket(this.url)
    
    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
    }
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      this.callbacks.onMessage(data)
    }
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.callbacks.onError(error)
    }
    
    this.ws.onclose = () => {
      console.log('WebSocket closed')
      this.callbacks.onClose()
      
      // 自动重连
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++
          this.connect()
        }, 1000 * this.reconnectAttempts)
      }
    }
  }
  
  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }
  
  close() {
    this.ws?.close()
  }
}
```

---

## 五、为什么我们选择SSE？

### 5.1 AI对话的特点分析

```
AI对话的通信模式：
- 用户发送问题（HTTP POST）
- AI流式返回答案（服务器推送）
- 不需要客户端主动推送数据

结论：单向通信，SSE完全满足需求
```

### 5.2 SSE的优势

**1. 自动重连**

```typescript
// SSE自动重连（内置）
fetchEventSource(url, {
  openWhenHidden: true  // 页面隐藏时也保持连接
})

// WebSocket需要手动实现
ws.onclose = () => {
  setTimeout(() => reconnect(), 1000)
}
```

**2. 代理友好**

```nginx
# Nginx配置SSE（简单）
location /api/ {
    proxy_pass http://backend;
    proxy_buffering off;  # 关键
}

# Nginx配置WebSocket（复杂）
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

**3. 实现简单**

```python
# SSE实现（10行代码）
async def event_generator():
    for token in tokens:
        yield f"data: {token}\n\n"

return StreamingResponse(event_generator())

# WebSocket实现（50+行代码）
# 需要连接管理、心跳检测、错误处理等
```

### 5.3 性能对比

```
测试场景：1000个并发连接，每秒推送100条消息

SSE:
- 内存占用: 500MB
- CPU占用: 20%
- 延迟: 10-20ms

WebSocket:
- 内存占用: 800MB
- CPU占用: 35%
- 延迟: 5-10ms

结论：SSE性能足够，且资源占用更低
```

---

## 六、生产环境最佳实践

### 6.1 Nginx配置

```nginx
server {
    listen 80;
    server_name api.example.com;
    
    # SSE配置
    location /api/chat/stream {
        proxy_pass http://backend:8000;
        
        # 关键配置
        proxy_buffering off;                    # 禁用缓冲
        proxy_cache off;                        # 禁用缓存
        proxy_set_header Connection '';         # 保持连接
        proxy_http_version 1.1;                 # HTTP/1.1
        chunked_transfer_encoding on;           # 分块传输
        
        # 超时配置
        proxy_read_timeout 3600s;               # 1小时超时
        proxy_connect_timeout 60s;
        
        # 头部设置
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Accel-Buffering no;  # 禁用加速缓冲
    }
}
```

### 6.2 错误处理

```typescript
// 完善的错误处理
export async function sendMessageStream(
  message: string,
  callbacks: StreamCallbacks
) {
  const ctrl = new AbortController()
  let retryCount = 0
  const maxRetries = 3
  
  const attemptStream = async () => {
    try {
      await fetchEventSource(url, {
        signal: ctrl.signal,
        
        async onopen(response) {
          if (response.ok) {
            retryCount = 0  // 重置重试计数
            return
          }
          
          // 处理HTTP错误
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`HTTP ${response.status}`)
          }
        },
        
        onmessage(event) {
          // 处理消息
        },
        
        onerror(err) {
          // 重试逻辑
          if (retryCount < maxRetries) {
            retryCount++
            console.log(`重试 ${retryCount}/${maxRetries}`)
            return 1000 * retryCount  // 返回重试延迟
          }
          
          // 超过重试次数，抛出错误
          throw err
        }
      })
    } catch (error) {
      callbacks.onError?.(error)
    }
  }
  
  await attemptStream()
  
  // 返回取消函数
  return () => ctrl.abort()
}
```

### 6.3 心跳检测

```python
# 服务端定期发送心跳
async def event_generator():
    last_heartbeat = time.time()
    
    async for token in llm.astream(question):
        yield f"data: {token}\n\n"
        
        # 每30秒发送心跳
        if time.time() - last_heartbeat > 30:
            yield ": heartbeat\n\n"  # 注释行，客户端会忽略
            last_heartbeat = time.time()
```

```typescript
// 客户端心跳检测
let lastMessageTime = Date.now()

fetchEventSource(url, {
  onmessage(event) {
    lastMessageTime = Date.now()
    // 处理消息
  }
})

// 检测超时
setInterval(() => {
  if (Date.now() - lastMessageTime > 60000) {
    console.warn('连接可能已断开')
    // 重新连接
  }
}, 10000)
```

---

## 七、性能优化

### 7.1 连接池管理

```python
# 限制并发连接数
from fastapi import HTTPException
import asyncio

active_connections = 0
MAX_CONNECTIONS = 1000

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    global active_connections
    
    if active_connections >= MAX_CONNECTIONS:
        raise HTTPException(
            status_code=503,
            detail="服务器繁忙，请稍后重试"
        )
    
    active_connections += 1
    
    try:
        async def event_generator():
            # 生成事件
            pass
        
        return StreamingResponse(event_generator())
    finally:
        active_connections -= 1
```

### 7.2 缓冲优化

```python
# 批量发送Token
async def event_generator():
    buffer = []
    buffer_size = 5  # 每5个Token发送一次
    
    async for token in llm.astream(question):
        buffer.append(token)
        
        if len(buffer) >= buffer_size:
            # 批量发送
            yield format_sse_message("token", {
                "tokens": buffer
            })
            buffer = []
    
    # 发送剩余Token
    if buffer:
        yield format_sse_message("token", {
            "tokens": buffer
        })
```

---

## 八、踩坑经验

### 8.1 Nginx缓冲问题

❌ **问题：** SSE消息不实时，延迟很大

```nginx
# 错误配置
location /api/ {
    proxy_pass http://backend;
    # 默认开启缓冲
}
```

✅ **解决：** 禁用缓冲

```nginx
location /api/ {
    proxy_pass http://backend;
    proxy_buffering off;
    proxy_set_header X-Accel-Buffering no;
}
```

### 8.2 CORS问题

❌ **问题：** SSE请求被CORS拦截

```python
# 错误：未配置CORS
app = FastAPI()
```

✅ **解决：** 正确配置CORS

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
```

### 8.3 内存泄漏

❌ **问题：** 长时间运行后内存占用越来越高

```python
# 错误：未清理资源
async def event_generator():
    async for chunk in llm.astream(question):
        yield chunk
    # 未清理LLM资源
```

✅ **解决：** 及时清理资源

```python
async def event_generator():
    try:
        async for chunk in llm.astream(question):
            yield chunk
    finally:
        # 清理资源
        await llm.cleanup()
```

---

## 九、总结

### 9.1 选择建议

```
选择SSE的场景：
✅ 服务器→客户端单向推送
✅ 实时通知、日志流
✅ AI对话、流式生成
✅ 需要自动重连
✅ 需要简单实现

选择WebSocket的场景：
✅ 双向实时通信
✅ 在线游戏
✅ 协作编辑
✅ 视频会议
✅ 需要二进制传输
```

### 9.2 核心要点

✅ **SSE更简单** - 基于HTTP，实现简单  
✅ **自动重连** - 内置重连机制  
✅ **代理友好** - 无需特殊配置  
✅ **性能足够** - 满足AI对话需求  
✅ **成本更低** - 开发和维护成本低  

**下一篇预告：** 《本地化部署的优势：Ollama + Weaviate保护数据隐私》

---

**作者简介：** 资深开发者，创业者。专注于视频通讯技术领域。国内首本Flutter著作《Flutter技术入门与实战》作者,另著有《Dart语言实战》及《WebRTC音视频开发》等书籍。多年从事视频会议、远程教育等技术研发，对于Android、iOS以及跨平台开发技术有比较深入的研究和应用，作为主要程序员开发了多个应用项目，涉及医疗、交通、银行等领域。

**学习资料：**
- [项目地址](https://github.com/kangshaojun/ai-agent-framework)
- [作者GitHub](https://github.com/kangshaojun)

**欢迎交流：** 如有问题欢迎在评论区讨论 🚀
