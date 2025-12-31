# SSE流式传输：实现打字机效果的AI回复

## 前言

打字机效果能显著提升AI对话的用户体验。本文将详细介绍如何使用SSE（Server-Sent Events）实现流式传输，打造流畅的实时对话体验。

**适合读者：** 前端开发者、全栈工程师

---

## 一、SSE基础

### 1.1 什么是SSE

```
SSE (Server-Sent Events)
- 服务器向客户端推送数据的技术
- 基于HTTP协议
- 单向通信（服务器→客户端）
- 自动重连
- 文本数据传输
```

### 1.2 SSE消息格式

```
event: message_type
data: {"key": "value"}
id: unique_id
retry: 3000

```

---

## 二、前端SSE实现

### 2.1 原生EventSource

```typescript
// 原生EventSource API
const eventSource = new EventSource('/api/chat/stream')

eventSource.onmessage = (event) => {
  console.log('收到消息:', event.data)
}

eventSource.onerror = (error) => {
  console.error('连接错误:', error)
  eventSource.close()
}

// 关闭连接
eventSource.close()
```

### 2.2 使用fetch-event-source

```typescript
// 安装依赖
// npm install @microsoft/fetch-event-source

import { fetchEventSource } from '@microsoft/fetch-event-source'

await fetchEventSource('/api/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    conversation_id: 'conv_123',
    message: '你好'
  }),
  
  onopen(response) {
    if (response.ok) {
      console.log('连接已建立')
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  },
  
  onmessage(event) {
    console.log('事件类型:', event.event)
    console.log('数据:', event.data)
  },
  
  onerror(err) {
    console.error('错误:', err)
    throw err
  },
  
  onclose() {
    console.log('连接已关闭')
  }
})
```

---

## 三、打字机效果实现

### 3.1 基础打字机组件

```typescript
// components/TypewriterText.tsx
'use client'

import { useState, useEffect } from 'react'

interface TypewriterTextProps {
  text: string
  speed?: number
  onComplete?: () => void
}

export function TypewriterText({ 
  text, 
  speed = 30,
  onComplete 
}: TypewriterTextProps) {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)

      return () => clearTimeout(timer)
    } else if (currentIndex === text.length && onComplete) {
      onComplete()
    }
  }, [currentIndex, text, speed, onComplete])

  return (
    <span>
      {displayText}
      {currentIndex < text.length && (
        <span className="inline-block w-0.5 h-4 ml-0.5 bg-current animate-pulse" />
      )}
    </span>
  )
}
```

### 3.2 实时流式打字机

```typescript
// components/StreamingMessage.tsx
'use client'

import { useState, useEffect, useRef } from 'react'

interface StreamingMessageProps {
  conversationId: string
  message: string
  onComplete?: (fullText: string) => void
}

export function StreamingMessage({
  conversationId,
  message,
  onComplete
}: StreamingMessageProps) {
  const [displayText, setDisplayText] = useState('')
  const [isStreaming, setIsStreaming] = useState(true)
  const [sources, setSources] = useState<any[]>([])
  const abortControllerRef = useRef<AbortController>()

  useEffect(() => {
    startStreaming()
    
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [conversationId, message])

  const startStreaming = async () => {
    abortControllerRef.current = new AbortController()
    
    try {
      await fetchEventSource('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: message
        }),
        signal: abortControllerRef.current.signal,
        
        onmessage(event) {
          const data = JSON.parse(event.data)
          
          switch (event.event) {
            case 'thinking':
              console.log('AI正在思考...')
              break
              
            case 'sources':
              setSources(data.sources || [])
              break
              
            case 'token':
              setDisplayText(prev => prev + data.token)
              break
              
            case 'done':
              setIsStreaming(false)
              onComplete?.(displayText)
              break
              
            case 'error':
              console.error('流式错误:', data.error)
              setIsStreaming(false)
              break
          }
        },
        
        onerror(err) {
          console.error('SSE错误:', err)
          setIsStreaming(false)
          throw err
        }
      })
    } catch (error) {
      console.error('流式传输失败:', error)
      setIsStreaming(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* 来源信息 */}
      {sources.length > 0 && (
        <div className="text-xs text-gray-6">
          参考了 {sources.length} 条相关文档
        </div>
      )}
      
      {/* 流式文本 */}
      <div className="text-sm whitespace-pre-wrap break-words">
        {displayText}
        {isStreaming && (
          <span className="inline-block w-0.5 h-4 ml-0.5 bg-blue-6 animate-pulse" />
        )}
      </div>
    </div>
  )
}
```

---

## 四、完整聊天实现

### 4.1 聊天服务封装

```typescript
// services/streaming-chat.service.ts
import { fetchEventSource } from '@microsoft/fetch-event-source'

export interface StreamCallbacks {
  onThinking?: (data: any) => void
  onSources?: (data: any) => void
  onToken?: (token: string) => void
  onDone?: (fullText: string) => void
  onError?: (error: string) => void
}

export class StreamingChatService {
  private abortController: AbortController | null = null

  async sendMessage(
    conversationId: string,
    message: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    this.abortController = new AbortController()
    let fullText = ''

    try {
      await fetchEventSource(`${API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: message
        }),
        signal: this.abortController.signal,
        
        async onopen(response) {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }
        },
        
        onmessage(event) {
          try {
            const data = JSON.parse(event.data)
            
            switch (event.event) {
              case 'thinking':
                callbacks.onThinking?.(data)
                break
                
              case 'sources':
                callbacks.onSources?.(data)
                break
                
              case 'token':
                fullText += data.token
                callbacks.onToken?.(data.token)
                break
                
              case 'done':
                callbacks.onDone?.(fullText)
                break
                
              case 'error':
                callbacks.onError?.(data.error)
                break
            }
          } catch (err) {
            console.error('解析消息失败:', err)
          }
        },
        
        onerror(err) {
          callbacks.onError?.(err.message)
          throw err
        }
      })
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        callbacks.onError?.(error.message)
      }
    }
  }

  abort() {
    this.abortController?.abort()
  }
}

export const streamingChatService = new StreamingChatService()
```

### 4.2 聊天组件

```typescript
// components/ChatInterface.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { streamingChatService } from '@/services/streaming-chat.service'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export function ChatInterface({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [currentStreamingText, setCurrentStreamingText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentStreamingText])

  const handleSend = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsThinking(true)
    setCurrentStreamingText('')

    try {
      await streamingChatService.sendMessage(
        conversationId,
        userMessage.content,
        {
          onThinking: (data) => {
            console.log('思考中:', data)
          },

          onSources: (data) => {
            console.log('检索到', data.count, '条文档')
            setIsThinking(false)
          },

          onToken: (token) => {
            setCurrentStreamingText(prev => prev + token)
          },

          onDone: (fullText) => {
            const assistantMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: fullText
            }
            setMessages(prev => [...prev, assistantMessage])
            setCurrentStreamingText('')
          },

          onError: (error) => {
            console.error('错误:', error)
            setIsThinking(false)
            setCurrentStreamingText('')
          }
        }
      )
    } catch (error) {
      console.error('发送失败:', error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* 实时流式消息 */}
        {currentStreamingText && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: currentStreamingText,
              isStreaming: true
            }}
          />
        )}

        {/* 思考指示器 */}
        {isThinking && <ThinkingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="输入消息..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-6"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isThinking}
            className="px-6 py-2 bg-blue-6 text-white rounded-lg hover:bg-blue-7 disabled:opacity-50"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 五、性能优化

### 5.1 防抖和节流

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// 使用示例
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  useEffect(() => {
    if (debouncedSearchTerm) {
      // 执行搜索
      performSearch(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm])

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="搜索..."
    />
  )
}
```

### 5.2 虚拟滚动优化

```typescript
// 使用react-window实现虚拟滚动
import { FixedSizeList } from 'react-window'

function VirtualMessageList({ messages }: { messages: Message[] }) {
  const Row = ({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <MessageBubble message={messages[index]} />
    </div>
  )

  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  )
}
```

### 5.3 批量更新优化

```typescript
// 批量更新Token以减少渲染次数
function useBatchedTokens(interval = 50) {
  const [tokens, setTokens] = useState<string[]>([])
  const bufferRef = useRef<string[]>([])
  const timerRef = useRef<NodeJS.Timeout>()

  const addToken = (token: string) => {
    bufferRef.current.push(token)

    if (!timerRef.current) {
      timerRef.current = setTimeout(() => {
        setTokens(prev => [...prev, ...bufferRef.current])
        bufferRef.current = []
        timerRef.current = undefined
      }, interval)
    }
  }

  const flush = () => {
    if (bufferRef.current.length > 0) {
      setTokens(prev => [...prev, ...bufferRef.current])
      bufferRef.current = []
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }

  return { tokens, addToken, flush }
}
```

---

## 六、错误处理

### 6.1 重连机制

```typescript
// services/resilient-stream.service.ts
export class ResilientStreamService {
  private maxRetries = 3
  private retryDelay = 1000

  async sendMessageWithRetry(
    conversationId: string,
    message: string,
    callbacks: StreamCallbacks,
    retryCount = 0
  ): Promise<void> {
    try {
      await streamingChatService.sendMessage(
        conversationId,
        message,
        callbacks
      )
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`重试 ${retryCount + 1}/${this.maxRetries}`)
        
        await new Promise(resolve => 
          setTimeout(resolve, this.retryDelay * (retryCount + 1))
        )
        
        return this.sendMessageWithRetry(
          conversationId,
          message,
          callbacks,
          retryCount + 1
        )
      }
      
      throw error
    }
  }
}
```

### 6.2 超时处理

```typescript
// utils/timeout.ts
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('请求超时')), timeoutMs)
    )
  ])
}

// 使用示例
try {
  await withTimeout(
    streamingChatService.sendMessage(conversationId, message, callbacks),
    30000  // 30秒超时
  )
} catch (error) {
  if (error.message === '请求超时') {
    console.error('请求超时，请重试')
  }
}
```

---

## 七、用户体验优化

### 7.1 加载状态

```typescript
// components/LoadingStates.tsx
export function ThinkingIndicator() {
  return (
    <div className="flex items-center space-x-2 text-gray-6">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-4 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-4 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-4 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm">AI正在思考...</span>
    </div>
  )
}

export function RetrievingIndicator({ count }: { count?: number }) {
  return (
    <div className="text-xs text-gray-6 flex items-center space-x-2">
      <div className="w-3 h-3 border-2 border-blue-6 border-t-transparent rounded-full animate-spin" />
      <span>正在检索知识库{count ? ` (${count}条)` : '...'}</span>
    </div>
  )
}
```

### 7.2 停止生成按钮

```typescript
// components/StopButton.tsx
export function StopGenerationButton({ 
  onStop 
}: { 
  onStop: () => void 
}) {
  return (
    <button
      onClick={onStop}
      className="px-4 py-2 bg-red-6 text-white rounded-lg hover:bg-red-7 transition-colors"
    >
      ⏹ 停止生成
    </button>
  )
}

// 在聊天组件中使用
function ChatInterface() {
  const handleStop = () => {
    streamingChatService.abort()
    setIsThinking(false)
    setCurrentStreamingText('')
  }

  return (
    <div>
      {/* ... */}
      {isThinking && <StopGenerationButton onStop={handleStop} />}
    </div>
  )
}
```

### 7.3 复制功能

```typescript
// components/CopyButton.tsx
'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 text-gray-6 hover:text-blue-6 transition-colors"
      title="复制"
    >
      {copied ? '✓' : '📋'}
    </button>
  )
}
```

---

## 八、Markdown渲染

### 8.1 实时Markdown渲染

```typescript
// components/MarkdownRenderer.tsx
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'

interface MarkdownRendererProps {
  content: string
  isStreaming?: boolean
}

export function MarkdownRenderer({ 
  content, 
  isStreaming 
}: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-gray-2 px-1 py-0.5 rounded text-xs" {...props}>
                {children}
              </code>
            )
          },
          
          p({ children }) {
            return <p className="mb-2">{children}</p>
          },
          
          ul({ children }) {
            return <ul className="list-disc pl-4 mb-2">{children}</ul>
          },
          
          ol({ children }) {
            return <ol className="list-decimal pl-4 mb-2">{children}</ol>
          }
        }}
      >
        {content}
      </ReactMarkdown>
      
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 ml-0.5 bg-blue-6 animate-pulse" />
      )}
    </div>
  )
}
```

---

## 九、测试

### 9.1 单元测试

```typescript
// __tests__/StreamingMessage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { StreamingMessage } from '@/components/StreamingMessage'

describe('StreamingMessage', () => {
  it('应该逐字显示文本', async () => {
    render(
      <StreamingMessage
        conversationId="test"
        message="测试消息"
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/测试消息/)).toBeInTheDocument()
    })
  })

  it('完成后应该调用onComplete', async () => {
    const onComplete = jest.fn()
    
    render(
      <StreamingMessage
        conversationId="test"
        message="测试"
        onComplete={onComplete}
      />
    )

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled()
    })
  })
})
```

---

## 十、总结

SSE流式传输的核心要点：

✅ **实时体验** - 打字机效果提升用户体验  
✅ **错误处理** - 重连机制保证稳定性  
✅ **性能优化** - 批量更新减少渲染  
✅ **用户控制** - 支持停止生成  
✅ **Markdown支持** - 实时渲染格式化内容  

**下一篇预告：** 《JWT认证在Next.js中的最佳实践》

---

**作者简介：** 资深开发者，创业者。专注于视频通讯技术领域。国内首本Flutter著作《Flutter技术入门与实战》作者,另著有《Dart语言实战》及《WebRTC音视频开发》等书籍。多年从事视频会议、远程教育等技术研发，对于Android、iOS以及跨平台开发技术有比较深入的研究和应用，作为主要程序员开发了多个应用项目，涉及医疗、交通、银行等领域。

**学习资料：**
- [项目地址](https://github.com/kangshaojun/ai-agent-framework)
- [作者GitHub](https://github.com/kangshaojun)

**欢迎交流：** 如有问题欢迎在评论区讨论 🚀
