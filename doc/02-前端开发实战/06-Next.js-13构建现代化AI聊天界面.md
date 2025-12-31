# Next.js 13构建现代化AI聊天界面

## 前言

Next.js 13引入了App Router、Server Components等革命性特性。本文将详细介绍如何使用Next.js 13构建一个功能完整、体验优秀的AI聊天界面。

**适合读者：** 前端开发者、React开发者、全栈工程师

---

## 一、项目初始化

### 1.1 创建Next.js项目

```bash
# 使用create-next-app创建项目
npx create-next-app@latest frontend --typescript --tailwind --app

# 进入项目目录
cd frontend

# 安装依赖
npm install axios @microsoft/fetch-event-source
npm install -D @types/node
```

### 1.2 项目结构

```
frontend/
├── app/                    # App Router目录
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   ├── login/             # 登录页
│   │   └── page.tsx
│   ├── register/          # 注册页
│   │   └── page.tsx
│   └── chat/              # 聊天页
│       └── page.tsx
├── components/            # 组件目录
│   ├── ChatMessage.tsx
│   ├── ChatInput.tsx
│   └── ThinkingIndicator.tsx
├── services/              # API服务
│   ├── auth.ts
│   └── chat.ts
├── ui/                    # UI组件
│   └── Icons.tsx
├── public/                # 静态资源
└── tailwind.config.ts     # Tailwind配置
```

---

## 二、App Router vs Pages Router

### 2.1 核心区别

| 特性 | Pages Router | App Router |
|------|--------------|------------|
| **目录** | `pages/` | `app/` |
| **路由文件** | `pages/chat.tsx` | `app/chat/page.tsx` |
| **布局** | `_app.tsx` | `layout.tsx` |
| **数据获取** | `getServerSideProps` | `async Component` |
| **客户端组件** | 默认 | 需要`'use client'` |
| **服务端组件** | 不支持 | 默认 |

### 2.2 App Router优势

```typescript
// ✅ App Router - 服务端组件（默认）
// app/chat/page.tsx
export default async function ChatPage() {
  // 可以直接在组件中获取数据
  const conversations = await fetchConversations()
  
  return <div>{/* UI */}</div>
}

// ❌ Pages Router - 需要getServerSideProps
// pages/chat.tsx
export async function getServerSideProps() {
  const conversations = await fetchConversations()
  return { props: { conversations } }
}

export default function ChatPage({ conversations }) {
  return <div>{/* UI */}</div>
}
```

---

## 三、聊天界面核心组件

### 3.1 根布局（layout.tsx）

```typescript
// app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Agent - 智能对话助手',
  description: '企业级AI对话系统',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
```

### 3.2 聊天页面主体

```typescript
// app/chat/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, isAuthenticated, User } from '@/services/auth'
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessageStream,
  Conversation,
  Message,
} from '@/services/chat'
import { ChatMessage } from '@/components/ChatMessage'
import { ChatInput } from '@/components/ChatInput'
import { ThinkingIndicator } from '@/components/ThinkingIndicator'

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [currentAssistantMessage, setCurrentAssistantMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 认证检查
  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        router.push('/login')
        return
      }
      
      try {
        const userData = await getCurrentUser()
        setUser(userData)
        
        // 加载对话列表
        const convs = await getConversations()
        setConversations(convs)
      } catch (error) {
        console.error('认证失败:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [router])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentAssistantMessage])

  // 创建新对话
  const handleNewChat = async () => {
    try {
      const newConv = await createConversation('新对话')
      setConversations([newConv, ...conversations])
      setCurrentConversation(newConv)
      setMessages([])
    } catch (error) {
      console.error('创建对话失败:', error)
    }
  }

  // 选择对话
  const handleSelectConversation = async (conv: Conversation) => {
    setCurrentConversation(conv)
    
    try {
      const msgs = await getMessages(conv.id)
      setMessages(msgs)
    } catch (error) {
      console.error('加载消息失败:', error)
    }
  }

  // 发送消息
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentConversation) return
    
    const userMessage = inputValue
    setInputValue('')
    
    // 添加用户消息
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, newUserMessage])
    
    // 开始思考
    setIsThinking(true)
    setCurrentAssistantMessage('')
    
    try {
      await sendMessageStream(
        currentConversation.id,
        userMessage,
        {
          onThinking: (data) => {
            console.log('思考中:', data)
          },
          
          onSources: (data) => {
            console.log('检索到', data.count, '条相关文档')
            setIsThinking(false)
          },
          
          onToken: (token) => {
            setCurrentAssistantMessage(prev => prev + token)
          },
          
          onDone: () => {
            // 保存助手消息
            const assistantMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: currentAssistantMessage,
              created_at: new Date().toISOString(),
            }
            setMessages(prev => [...prev, assistantMessage])
            setCurrentAssistantMessage('')
          },
          
          onError: (error) => {
            console.error('发送失败:', error)
            setIsThinking(false)
          }
        }
      )
    } catch (error) {
      console.error('发送消息失败:', error)
      setIsThinking(false)
    }
  }

  // 键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span>新建对话</span>
          </button>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSelectConversation(conv)}
              className={`px-3 py-2.5 mb-1 rounded-lg cursor-pointer transition-colors ${
                currentConversation?.id === conv.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <div className="text-sm truncate">{conv.title}</div>
            </div>
          ))}
        </div>

        {/* 用户信息 */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm text-gray-600">
                {user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-gray-700 truncate">
              {user?.username}
            </span>
          </div>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 头部 */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4">
          <h1 className="text-lg font-semibold text-gray-800">
            {currentConversation?.title || '选择或创建对话'}
          </h1>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto">
          {!currentConversation ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-3xl">🤖</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                今天有什么可以帮到你？
              </h2>
              <p className="text-gray-600 mb-6">
                点击"新建对话"开始与 AI 助手交流
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              
              {/* 实时显示助手回复 */}
              {currentAssistantMessage && (
                <ChatMessage
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: currentAssistantMessage,
                    created_at: new Date().toISOString(),
                  }}
                  isStreaming={true}
                />
              )}
              
              {/* 思考指示器 */}
              {isThinking && <ThinkingIndicator />}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 输入区域 */}
        {currentConversation && (
          <div className="bg-white border-t border-gray-200 p-4">
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSendMessage}
              onKeyPress={handleKeyPress}
              disabled={isThinking}
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

### 3.3 消息组件

```typescript
// components/ChatMessage.tsx
import { Message } from '@/services/chat'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`mb-6 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex space-x-3 max-w-[80%] ${
          isUser ? 'flex-row-reverse space-x-reverse' : ''
        }`}
      >
        {/* 头像 */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span className={`text-sm ${isUser ? 'text-white' : 'text-gray-600'}`}>
            {isUser ? '👤' : '🤖'}
          </span>
        </div>

        {/* 消息内容 */}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 text-gray-800'
          }`}
        >
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 3.4 输入组件

```typescript
// components/ChatInput.tsx
import { SendIcon } from '@/ui/Icons'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onKeyPress: (e: React.KeyboardEvent) => void
  disabled?: boolean
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onKeyPress,
  disabled
}: ChatInputProps) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-end space-x-3 bg-gray-50 rounded-2xl p-3 border border-gray-200 focus-within:border-blue-600 transition-colors">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="在这里输入消息..."
          className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-800 placeholder-gray-500 max-h-32"
          rows={1}
          disabled={disabled}
        />
        <button
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <SendIcon size={18} />
        </button>
      </div>
      <p className="text-xs text-gray-500 text-center mt-2">
        AI 回答可能不准确，请谨慎使用
      </p>
    </div>
  )
}
```

### 3.5 思考指示器

```typescript
// components/ThinkingIndicator.tsx
export function ThinkingIndicator() {
  return (
    <div className="mb-6 flex justify-start">
      <div className="flex space-x-3 max-w-[80%]">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200">
          <span className="text-sm text-gray-600">🤖</span>
        </div>
        
        <div className="px-4 py-3 rounded-2xl bg-white border border-gray-200">
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

## 四、API服务封装

### 4.1 认证服务

```typescript
// services/auth.ts
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface User {
  id: number
  username: string
  email: string
  full_name?: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await axios.post(`${API_URL}/api/auth/login`, {
    username,
    password
  })
  
  const data = response.data.data
  setTokens(data.access_token, data.refresh_token)
  return data
}

export async function getCurrentUser(): Promise<User> {
  const response = await axios.get(`${API_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`
    }
  })
  return response.data.data
}

export async function logout() {
  clearTokens()
}
```

### 4.2 聊天服务

```typescript
// services/chat.ts
import axios from 'axios'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { getAccessToken } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export async function getConversations(): Promise<Conversation[]> {
  const response = await axios.get(`${API_URL}/api/conversations`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`
    }
  })
  return response.data.data
}

export async function createConversation(title: string): Promise<Conversation> {
  const response = await axios.post(
    `${API_URL}/api/conversations`,
    { title },
    {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`
      }
    }
  )
  return response.data.data
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const response = await axios.get(
    `${API_URL}/api/conversations/${conversationId}/messages`,
    {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`
      }
    }
  )
  return response.data.data
}

interface StreamCallbacks {
  onThinking?: (data: any) => void
  onSources?: (data: any) => void
  onToken?: (token: string) => void
  onDone?: () => void
  onError?: (error: string) => void
}

export async function sendMessageStream(
  conversationId: string,
  message: string,
  callbacks: StreamCallbacks
) {
  const ctrl = new AbortController()
  
  await fetchEventSource(`${API_URL}/api/chat/stream`, {
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
    
    onmessage(event) {
      const data = JSON.parse(event.data)
      
      switch (event.event) {
        case 'thinking':
          callbacks.onThinking?.(data)
          break
        case 'sources':
          callbacks.onSources?.(data)
          break
        case 'token':
          callbacks.onToken?.(data.token)
          break
        case 'done':
          callbacks.onDone?.()
          break
        case 'error':
          callbacks.onError?.(data.error)
          ctrl.abort()
          break
      }
    },
    
    onerror(err) {
      console.error('SSE Error:', err)
      callbacks.onError?.(err.message)
      throw err
    }
  })
}
```

---

## 五、响应式设计

### 5.1 移动端适配

```typescript
// app/chat/page.tsx
'use client'

import { useState } from 'react'

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 - 移动端可折叠 */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } lg:w-64 transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}
      >
        {/* 侧边栏内容 */}
      </div>

      {/* 主区域 */}
      <div className="flex-1 flex flex-col">
        {/* 头部 - 移动端显示菜单按钮 */}
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded mr-2"
          >
            ☰
          </button>
          <h1 className="text-lg font-semibold text-gray-800">
            {currentConversation?.title || '选择或创建对话'}
          </h1>
        </div>
        
        {/* 其他内容 */}
      </div>
    </div>
  )
}
```

### 5.2 Tailwind响应式类

```tsx
<div className="
  w-full          /* 移动端：全宽 */
  md:w-1/2        /* 平板：半宽 */
  lg:w-1/3        /* 桌面：1/3宽 */
  p-4             /* 移动端：padding 16px */
  md:p-6          /* 平板：padding 24px */
  lg:p-8          /* 桌面：padding 32px */
">
  响应式内容
</div>
```

---

## 六、性能优化

### 6.1 代码分割

```typescript
// 动态导入组件
import dynamic from 'next/dynamic'

const ChatMessage = dynamic(() => import('@/components/ChatMessage'), {
  loading: () => <div>加载中...</div>
})
```

### 6.2 图片优化

```typescript
import Image from 'next/image'

<Image
  src="/avatar.png"
  alt="用户头像"
  width={32}
  height={32}
  className="rounded-full"
/>
```

### 6.3 虚拟滚动

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function MessageList({ messages }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  })
  
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ChatMessage message={messages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 七、总结

Next.js 13构建AI聊天界面的核心要点：

✅ **App Router** - 使用新的路由系统  
✅ **Client Components** - 交互组件使用`'use client'`  
✅ **SSE流式传输** - 实时显示AI回复  
✅ **响应式设计** - 适配移动端和桌面端  
✅ **性能优化** - 代码分割、虚拟滚动  

**下一篇预告：** 《TailwindCSS打造优雅的对话UI组件》

---

**作者简介：** 资深开发者，创业者。专注于视频通讯技术领域。国内首本Flutter著作《Flutter技术入门与实战》作者,另著有《Dart语言实战》及《WebRTC音视频开发》等书籍。多年从事视频会议、远程教育等技术研发，对于Android、iOS以及跨平台开发技术有比较深入的研究和应用，作为主要程序员开发了多个应用项目，涉及医疗、交通、银行等领域。

**学习资料：**
- [项目地址](https://github.com/kangshaojun/ai-agent-framework)
- [作者GitHub](https://github.com/kangshaojun)

**欢迎交流：** 如有问题欢迎在评论区讨论 🚀
