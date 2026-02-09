# AI Agent Framework 前后端数据交互规范

本 Skill 定义了 AI Agent Framework 项目中前后端数据交互的标准规范，包括响应格式、错误码、认证机制和 API 调用方式。

## 1. 统一响应格式

所有 API 响应必须使用以下统一 JSON 结构：

```json
{
  "code": 0,        // 业务状态码 (0=成功, >1000=业务错误)
  "msg": "success", // 提示信息
  "data": {}        // 业务数据 (对象或数组)
}
```

### 响应辅助方法（后端）

```python
from server.web.api.response import ApiResponse, success_response, error_response

# 成功响应
return ApiResponse.success(data=user_data, msg="操作成功")
# 或快捷方式
return success_response(data=user_data)

# 错误响应
return ApiResponse.error(code=ErrorCode.USER_NOT_FOUND, msg="用户不存在")
# 或快捷方式  
return error_response(code=1100, msg="用户不存在")
```

### 响应处理（前端）

```typescript
import { httpGet, httpPost, ApiResponse } from '@/utils/request'

const response: ApiResponse<User> = await httpGet('/users/me')
if (response?.code === 0) {
  // 成功，使用 response.data
} else {
  // 失败，使用 response.msg 显示错误
}
```

## 2. 错误码规范

| 范围 | 类别 | 常用错误码 |
|------|------|-----------|
| `0` | 成功 | `SUCCESS = 0` |
| `1000-1099` | 通用错误 | `PARAM_ERROR = 1000`, `BUSINESS_ERROR = 1001` |
| `1100-1199` | 用户相关 | `USER_NOT_FOUND = 1100`, `INVALID_CREDENTIALS = 1103`, `TOKEN_EXPIRED = 1104` |
| `1200-1299` | 对话相关 | `CONVERSATION_NOT_FOUND = 1200`, `MESSAGE_SEND_FAILED = 1202` |
| `1300-1399` | 数据库错误 | `DATABASE_ERROR = 1300`, `DUPLICATE_ENTRY = 1302` |
| `1400-1499` | 外部服务 | `EXTERNAL_SERVICE_ERROR = 1400`, `MCP_SERVICE_ERROR = 1401` |
| `2000-2999` | Agent 错误 | `AGENT_ERROR = 2000`, `LLM_CALL_ERROR = 2002`, `RAG_RETRIEVAL_ERROR = 2001` |

### 判断响应状态（前端工具函数）

```typescript
import { isSuccess, isAuthError, ErrorCode } from '@/utils/errorCodes'

// 判断成功
if (isSuccess(response.code)) { ... }

// 判断认证错误 (1100-1199)
if (isAuthError(response.code)) { 
  // 清除 token 并跳转登录
}

// 判断特定错误
if (response.code === ErrorCode.TOKEN_EXPIRED) { ... }
```

## 3. 认证机制

### JWT Token 流程

1. **登录** → 获取 `access_token` 和 `refresh_token`
2. **请求 API** → Header 携带 `Authorization: Bearer <access_token>`
3. **Token 过期** (401 或 code=1104) → 使用 `refresh_token` 刷新
4. **刷新失败** → 清除 token 并跳转登录页

### 前端 Token 管理

```typescript
// 登录后存储
localStorage.setItem('access_token', response.access_token)
localStorage.setItem('refresh_token', response.refresh_token)

// 请求拦截器自动添加 Header
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 退出登录
localStorage.removeItem('access_token')
localStorage.removeItem('refresh_token')
window.location.href = '/login'
```

## 4. API 端点列表

### 用户相关 (`/users`)

| 端点 | 方法 | 请求体 | 响应数据 | 说明 |
|------|------|--------|---------|------|
| `/users/register` | POST | `{username, email, password, full_name?}` | `UserResponse` | 注册 |
| `/users/login` | POST | `{username, password}` | `TokenResponse` | 登录 |
| `/users/refresh` | POST | - | `TokenResponse` | 刷新 Token |
| `/users/me` | GET | - | `UserResponse` | 当前用户信息 |
| `/users/` | GET | - | `UserResponse[]` | 用户列表（需超管） |

### 对话相关 (`/conversations`)

| 端点 | 方法 | 请求体 | 响应数据 | 说明 |
|------|------|--------|---------|------|
| `/conversations` | GET | - | `ConversationResponse[]` | 获取对话列表 |
| `/conversations` | POST | `{title?}` | `ConversationResponse` | 创建对话 |
| `/conversations/{id}` | GET | - | `ConversationResponse` | 获取对话详情 |
| `/conversations/{id}` | PUT | `{title}` | `ConversationResponse` | 更新对话标题 |
| `/conversations/{id}/delete` | POST | - | - | 删除对话 |
| `/conversations/{id}/messages` | GET | - | `MessageResponse[]` | 获取消息列表 |
| `/conversations/messages/stream` | POST | `{conversation_id, content}` | SSE Stream | 流式发送消息 |

## 5. 流式消息 (SSE) 规范

### 连接方式

```typescript
import { fetchEventSource } from '@microsoft/fetch-event-source'

await fetchEventSource('/api/conversations/messages/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    conversation_id: '123',
    content: '用户问题'
  }),
  onmessage(event) {
    // 处理 SSE 事件
  }
})
```

### SSE 事件类型

后端通过 SSE 发送以下事件：

| 事件类型 | 数据格式 | 说明 |
|---------|---------|------|
| `thinking` | `{status: string, message: string}` | 思考状态更新 |
| `sources` | `{sources: Array, count: number}` | 检索到的来源 |
| `token` | `{token: string}` | 生成的文本片段（逐字） |
| `done` | `{message_id: string, metadata: object}` | 生成完成 |
| `error` | `{code: number, msg: string}` | 错误信息 |

### SSE 事件格式（后端）

```python
def _format_sse_event(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

# 发送 token
yield _format_sse_event("token", {"token": "生成的文本"})

# 发送完成事件
yield _format_sse_event("done", {
    "message_id": str(assistant_message.id),
    "metadata": {}
})
```

## 6. 前端请求封装

### HTTP 方法

```typescript
import { httpGet, httpPost, httpPut, httpDelete } from '@/utils/request'

// GET
const users = await httpGet<User[]>('/users')

// POST
const newConv = await httpPost<Conversation>('/conversations', { title: '新对话' })

// PUT
await httpPut(`/conversations/${id}`, { title: '新标题' })

// DELETE（通过 POST /delete 端点）
await httpPost(`/conversations/${id}/delete`, {})
```

### 类型定义

```typescript
// 统一响应类型
interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T | null
}

// 用户
interface User {
  id: number
  username: string
  email: string
  full_name: string | null
  is_active: boolean
  created_at: string
}

// 对话
interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

// 消息
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}
```

## 7. 后端开发规范

### 视图函数模板

```python
from fastapi import APIRouter, Depends, HTTPException
from server.web.api.response import ApiResponse, success_response
from server.auth import get_current_user

router = APIRouter()

@router.post("/example", response_model=ApiResponse[ResponseSchema])
async def example_endpoint(
    data: RequestSchema,
    current_user: User = Depends(get_current_user),  # 需要认证
) -> ApiResponse[ResponseSchema]:
    try:
        # 业务逻辑
        result = await do_something(data)
        return ApiResponse.success(data=result, msg="操作成功")
    except SomeException as e:
        # 抛出 HTTPException 会被全局异常处理
        raise HTTPException(status_code=400, detail=str(e))
```

### 新增错误码步骤

1. 在 `server/web/api/error_codes.py` 添加枚举值
2. 在 `ERROR_MESSAGES` 中添加默认消息
3. 在 `frontend/utils/errorCodes.ts` 同步添加前端枚举

## 8. 配置参考

### 后端环境变量 (.env)

```bash
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
SERVER_AGENT_BASE_URL=http://localhost:8001  # Agent 服务地址

# 数据库
SERVER_DB_HOST=localhost
SERVER_DB_PORT=5432
SERVER_DB_USER=server
SERVER_DB_PASS=server
SERVER_DB_BASE=server

# Redis
SERVER_REDIS_HOST=localhost
SERVER_REDIS_PORT=6379
SERVER_REDIS_PASS=server
```

### 前端环境变量

```bash
# .env.local
NEXT_PUBLIC_API_BASE=http://localhost:8000/api
NEXT_PUBLIC_MAIN_DOMAIN=localhost
NEXT_PUBLIC_IS_DEV=true
```

## 9. 注意事项

1. **前后端错误码必须保持一致** - 修改时需同步更新两端代码
2. **SSE 连接不要立即 abort** - 让连接自然关闭，等待 done 或 error 事件
3. **数据库操作后及时 commit** - 在返回响应前确保 session.commit()
4. **延迟加载问题** - 在 commit 前获取所有需要的 ORM 属性
5. **认证接口不刷新 token** - /login, /register, /refresh 不参与 token 刷新逻辑
