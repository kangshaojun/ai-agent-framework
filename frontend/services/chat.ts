import { httpPost, httpGet, httpPut } from '@/utils/request'
import { fetchEventSource } from '@microsoft/fetch-event-source'

// 对话类型
export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

// 消息类型
export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  thinking?: boolean
}

// 创建对话请求
export interface CreateConversationRequest {
  title?: string
}

// 发送消息请求
export interface SendMessageRequest {
  conversation_id: string
  content: string
}

/**
 * 获取对话列表
 */
export const getConversations = async (): Promise<Conversation[]> => {
  return httpGet<Conversation[]>('/conversations')
}

/**
 * 创建新对话
 */
export const createConversation = async (
  data?: CreateConversationRequest
): Promise<Conversation> => {
  return httpPost<Conversation>('/conversations', data || {})
}

/**
 * 获取对话消息
 */
export const getMessages = async (conversationId: string): Promise<Message[]> => {
  return httpGet<Message[]>(`/conversations/${conversationId}/messages`)
}

/**
 * 删除对话
 */
export const deleteConversation = async (conversationId: string): Promise<void> => {
  await httpPost(`/conversations/${conversationId}/delete`, {})
}

/**
 * 更新对话标题
 */
export const updateConversationTitle = async (
  conversationId: string,
  title: string
): Promise<Conversation> => {
  return httpPut<Conversation>(`/conversations/${conversationId}`, { title })
}

/**
 * 流式事件类型
 */
export interface StreamEvent {
  type: 'thinking' | 'sources' | 'token' | 'done' | 'error'
  data: unknown
}

/**
 * 流式消息回调
 */
export interface StreamCallbacks {
  onThinking?: (data: { status: string; message: string }) => void
  onSources?: (data: { sources: unknown[]; count: number }) => void
  onToken?: (token: string) => void
  onDone?: (data: { message_id: string; metadata: unknown }) => void
  onError?: (error: { code: number; msg: string }) => void
}

/**
 * 流式发送消息
 */
export const sendMessageStream = async (
  data: SendMessageRequest,
  callbacks: StreamCallbacks
): Promise<void> => {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('未登录')
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const url = `${apiUrl}/api/conversations/messages/stream`

  const ctrl = new AbortController()

  try {
    await fetchEventSource(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      signal: ctrl.signal,

      async onopen(response) {
        if (response.ok) return

        let errorMsg = `HTTP 错误: ${response.status}`
        try {
          const errorData = await response.json()
          errorMsg = errorData.detail || errorData.msg || errorMsg
        } catch {
          // ignore
        }
        throw new Error(errorMsg)
      },

      onmessage(event) {
        const eventType = event.event || 'message'
        try {
          const eventData = JSON.parse(event.data)
          switch (eventType) {
            case 'thinking':
              callbacks.onThinking?.(eventData)
              break
            case 'sources':
              callbacks.onSources?.(eventData)
              break
            case 'token':
              callbacks.onToken?.(eventData.token)
              break
            case 'done':
              callbacks.onDone?.(eventData)
              break
            case 'error':
              callbacks.onError?.(eventData)
              break
          }
        } catch (e) {
          console.error('Failed to parse event data:', e)
        }
      },

      onerror(err) {
        callbacks.onError?.({
          code: 500,
          msg: '连接错误',
        })
        throw err
      },
    })
  } catch (error: unknown) {
    const err = error as { name?: string }
    if (err.name !== 'AbortError') {
      throw error
    }
  }
}
