'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout, isAuthenticated, User } from '@/services/auth'
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessageStream,
  deleteConversation,
  updateConversationTitle,
  Conversation,
  Message,
} from '@/services/chat'
import {
  PlusIcon,
  TrashIcon,
  MessageSquareIcon,
  LogOutIcon,
  UserIcon,
  BotIcon,
  MenuIcon,
  XIcon,
  MoreVerticalIcon,
  EditIcon,
  CheckIcon,
} from '@/ui/Icons'
import { ThinkingIndicator } from '@/ui/ThinkingIndicator'

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // 检查登录状态
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    // 获取用户信息和对话列表
    const fetchData = async () => {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
        const convs = await getConversations()
        setConversations(convs)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])  
  

  useEffect(() => {
    // 滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])


  useEffect(() => {
    // 编辑时自动聚焦并全选
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleLogout = () => {
    logout()
  }

  const handleNewChat = async () => {
    try {
      const newConv = await createConversation({
        title: 'New Chat',
      })
      setConversations([newConv, ...conversations])
      setCurrentConversation(newConv)
      setMessages([])
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const handleSelectConversation = async (conv: Conversation) => {
    setCurrentConversation(conv)
    try {
      const msgs = await getMessages(conv.id)
      setMessages(msgs)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation()
    setConversationToDelete(convId)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return
    
    try {
      await deleteConversation(conversationToDelete)
      setConversations(conversations.filter((c) => c.id !== conversationToDelete))
      if (currentConversation?.id === conversationToDelete) {
        setCurrentConversation(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    } finally {
      setDeleteConfirmOpen(false)
      setConversationToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false)
    setConversationToDelete(null)
  }

  const handleRenameClick = (convId: string, currentTitle: string) => {
    setEditingId(convId)
    setEditingTitle(currentTitle)
    setMenuOpenId(null)
  }

  const handleSaveRename = async (convId: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null)
      return
    }

    try {
      await updateConversationTitle(convId, editingTitle.trim())
      setConversations(
        conversations.map((c) =>
          c.id === convId ? { ...c, title: editingTitle.trim() } : c
        )
      )
      if (currentConversation?.id === convId) {
        setCurrentConversation({ ...currentConversation, title: editingTitle.trim() })
      }
    } catch (error) {
      console.error('Failed to update title:', error)
    } finally {
      setEditingId(null)
    }
  }

  const handleCancelRename = () => {
    setEditingId(null)
    setEditingTitle('')
  }

  const handleRenameKeyPress = (e: React.KeyboardEvent, convId: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(convId)
    } else if (e.key === 'Escape') {
      handleCancelRename()
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentConversation || isSending) return

    const userMessage = inputValue.trim()
    const isFirstMessage = messages.length === 0
    setInputValue('')
    setIsSending(true)

    // 添加用户消息到界面
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages([...messages, tempUserMsg])

    // 添加助手消息占位（用于流式更新）
    const assistantMsgId = (Date.now() + 1).toString()
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      thinking: true,
    }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      await sendMessageStream({
        conversation_id: currentConversation.id,
        content: userMessage,
      },
      {
        onThinking: (data) => {
          // 更新思考状态
          setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: data.message, thinking: true }
                  : m
              )
          )
        },
        onSources: (data) => {
            // 可以显示来源信息（可选）
            console.log('检索到来源:', data.sources)
        },
        onToken: (token) => {
          // 逐 token 更新消息内容
          setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + token, thinking: false }
                  : m
              )
          )
        },
        onDone: async (data) => {
          // 完成，更新消息 ID
          setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, id: data.message_id, thinking: false }
                  : m
              )
            )
            // 如果是第一条消息，刷新对话列表以获取AI生成的标题
            if (isFirstMessage) {
              const updatedConversations = await getConversations()
              setConversations(updatedConversations)
              const updatedConv = updatedConversations.find(
                (c) => c.id === currentConversation.id
              )
              if (updatedConv) {
                setCurrentConversation(updatedConv)
              }
            }

            setIsSending(false)
        },
        onError: (error) => {
            console.error('Streaming message error:', error)
            // 显示错误消息
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: error.msg || 'Sorry, AI service is temporarily unavailable',
                      thinking: false,
                    }
                  : m
              )
            )
            setIsSending(false)
          },
      }
    )
    } catch(error){
      console.error('Failed to send message:', error)
      // 移除思考消息
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId))
      setIsSending(false)
    }
  }


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-2">
        <div className="text-gray-7">加载中...</div>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-screen bg-gray-2">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 bg-white border-r border-gray-4 flex flex-col overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-4">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-8 h-8 bg-blue-6 rounded-lg flex items-center justify-center">
                <span className="text-gray-1 font-bold text-sm">AI</span>
              </div>
              <span className="font-semibold text-gray-10">My</span>
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-3 rounded"
            >
              <XIcon size={20} className="text-gray-7" />
            </button>
          </div>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-6 text-white rounded-lg hover:bg-blue-7 transition-colors"
          >
            <PlusIcon size={18} className="text-gray-1" />
            <span className="font-medium text-gray-1">New Chat</span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-7 text-sm py-8">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative flex items-center justify-between px-3 py-2.5 mb-1 rounded-lg transition-colors ${
                  currentConversation?.id === conv.id
                    ? 'bg-blue-1 text-blue-7'
                    : 'hover:bg-gray-3 text-gray-10'
                } ${editingId === conv.id ? '' : 'cursor-pointer'}`}
                onClick={() => editingId !== conv.id && handleSelectConversation(conv)}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <MessageSquareIcon size={16} className="flex-shrink-0" />
                  {editingId === conv.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => handleRenameKeyPress(e, conv.id)}
                      onBlur={() => handleSaveRename(conv.id)}
                      className="flex-1 text-sm bg-white border border-blue-6 rounded px-2 py-1 outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm truncate">{conv.title}</span>
                  )}
                </div>
                
                {editingId === conv.id ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSaveRename(conv.id)
                    }}
                    className="p-1 hover:bg-green-1 rounded flex-shrink-0"
                  >
                    <CheckIcon size={14} className="text-green-6" />
                  </button>
                ) : (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpenId(menuOpenId === conv.id ? null : conv.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-4 rounded transition-opacity"
                    >
                      <MoreVerticalIcon size={14} />
                    </button>
                    
                    {menuOpenId === conv.id && (
                      <div 
                        className="absolute right-0 top-8 rounded-lg shadow-2xl border border-gray-4 py-2 z-[9999] min-w-[140px]"
                        style={{ backgroundColor: '#ffffff' }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRenameClick(conv.id, conv.title)
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-2 text-gray-10 text-base"
                        >
                          <EditIcon size={16} />
                          <span>Rename</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(e, conv.id)
                            setMenuOpenId(null)
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-1 text-red-6 text-base"
                        >
                          <TrashIcon size={16} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 bg-gray-4 rounded-full flex items-center justify-center flex-shrink-0">
                <UserIcon size={16} className="text-gray-7" />
              </div>
              <span className="text-sm text-gray-10 truncate">
                {user?.full_name || user?.username}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-3 rounded transition-colors"
              title="退出登录"
            >
              <LogOutIcon size={16} className="text-gray-7" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 bg-white border-b border-gray-4 flex items-center px-4">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-3 rounded mr-2"
            >
              <MenuIcon size={20} className="text-gray-7" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-gray-10">
            {currentConversation?.title || 'Select or create a chat'}
          </h1>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {!currentConversation ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-blue-1 rounded-2xl flex items-center justify-center mb-4">
                <BotIcon size={32} className="text-blue-6" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-10 mb-2">
                How can I help you today?
              </h2>
              <p className="text-gray-7 mb-6">
                Click &ldquo;New Chat&rdquo; to start chatting with AI assistant
              </p>
              <button
                onClick={handleNewChat}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-6 text-white rounded-lg hover:bg-blue-7 transition-colors"
              >
                <PlusIcon size={18} className="text-gray-1" />
                <span className="text-gray-1">New Chat</span>
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-blue-1 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquareIcon size={32} className="text-blue-6" />
              </div>
              <h2 className="text-xl font-semibold text-gray-10 mb-2">
                Start New Chat
              </h2>
              <p className="text-gray-7">Enter your question in the input box below</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-6 flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`flex space-x-3 max-w-[80%] ${
                      msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-4">
                      {msg.role === 'user' ? (
                        <UserIcon size={16} className="text-gray-7" />
                      ) : (
                        <BotIcon size={16} className="text-gray-7" />
                      )}
                    </div>
                    {/* Message Content */}
                    <div className="px-4 py-3 rounded-2xl bg-white border border-gray-4">
                      {msg.thinking ? (
                        <ThinkingIndicator />
                      ) : (
                        <div className="text-sm whitespace-pre-wrap break-words text-gray-10">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {currentConversation && (
          <div className="bg-white border-t border-gray-4 p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center space-x-3 bg-gray-2 rounded-2xl p-3 border border-gray-4 focus-within:border-blue-6 transition-colors">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Send a message..."
                  className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-10 placeholder-gray-7 max-h-32 py-1"
                  rows={1}
                  disabled={isSending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isSending}
                  className="px-4 py-2.5 bg-blue-6 rounded-xl hover:bg-blue-7 disabled:bg-gray-5 disabled:cursor-not-allowed transition-colors flex-shrink-0 font-medium"
                  style={{ 
                    color: (!inputValue.trim() || isSending) ? '#8c8c8c' : '#ffffff' 
                  }}
                >
                  Send
                </button>
              </div>
              <p className="text-xs text-gray-7 text-center mt-2">
                AI responses may be inaccurate, please use with caution
              </p>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[9999]"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onClick={handleCancelDelete}
        >
          <div 
            className="rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            style={{ backgroundColor: '#ffffff', opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-10 mb-2">
              Permanently Delete Conversation
            </h3>
            <p className="text-gray-7 text-sm mb-6">
              Once deleted, this conversation cannot be recovered. Confirm deletion?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-gray-10 hover:bg-gray-3 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-6 text-white rounded-lg hover:bg-red-7 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )  
}