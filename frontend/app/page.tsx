'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getCurrentUser, logout, User } from '@/services/auth'
import { BotIcon, MessageSquareIcon, SparklesIcon, ZapIcon, LogOutIcon } from '@/ui/Icons'

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // 检测登录状态
    const checkAuth = async () => {
      if (isAuthenticated()) {
        try {
          const userData = await getCurrentUser()
          setUser(userData)
          setIsLoggedIn(true)
        } catch (error) {
          console.error('Failed to get user info:', error)
          setIsLoggedIn(false)
        }
      }
    }
    checkAuth()
  }, [])

  const handleStartChat = () => {
    // 检查是否已登录
    if(isAuthenticated()) {
      router.push('/chat')
    } else {
      // 未登录，跳转到登录页面
      router.push('/login')
    }
  }

  const handleLogout = () => {
    logout()
    setUser(null)
    setIsLoggedIn(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-6 rounded-xl flex items-center justify-center">
                <BotIcon size={24} className="text-white" style={{ color: '#ffffff' }} />
              </div>
              <span className="text-2xl font-bold text-gray-10">AI Assistant</span>
            </div>
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                // 已登录：显示用户信息和退出按钮
                <>
                  <span className="text-sm text-gray-10">
                    {user?.full_name || user?.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-gray-10 hover:text-blue-6 transition-colors font-medium flex items-center space-x-2"
                  >
                    <LogOutIcon size={16} />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                // 未登录：显示登录和注册按钮
                <>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-2 text-gray-10 hover:text-blue-6 transition-colors font-medium"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => router.push('/register')}
                    className="px-4 py-2 bg-blue-6 rounded-lg hover:bg-blue-7 transition-colors font-medium"
                    style={{ color: '#ffffff' }}
                  >
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-32">
          <div className="text-center">
            {/* Main Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-6 to-blue-7 rounded-3xl flex items-center justify-center shadow-2xl">
                  <BotIcon size={48} className="text-white" style={{ color: '#ffffff' }} />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-5 rounded-full flex items-center justify-center animate-pulse">
                  <SparklesIcon size={16} className="text-white" style={{ color: '#ffffff' }} />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-10 mb-6">
              Enterprise AI
              <span className="bg-gradient-to-r from-blue-6 to-blue-7 bg-clip-text text-transparent">
                {' '}Platform
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-7 mb-12 max-w-2xl mx-auto">
              On-Premise Solutions for Data-Sensitive Industries
            </p>
            <p className="text-base text-gray-7 mb-12 max-w-3xl mx-auto">
              Deploy AI-powered solutions within your own infrastructure. Designed for banking, healthcare, insurance, education, legal services, and other data-sensitive industries. Your data stays secure and compliant.
            </p>

            {/* CTA Button */}
            <button
              onClick={handleStartChat}
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-6 to-blue-7 text-lg font-semibold rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              style={{ color: '#ffffff' }}
            >
              <MessageSquareIcon size={24} />
              <span>{isLoggedIn ? 'Enter Chat' : 'Start Chat'}</span>
            </button>

            {/* Features */}
            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Feature 1 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-blue-1 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <ZapIcon size={28} className="text-blue-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-10 mb-3">
                  Data Security
                </h3>
                <p className="text-gray-7">
                  Complete control over your sensitive data with air-gapped deployment options
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-blue-1 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <SparklesIcon size={28} className="text-blue-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-10 mb-3">
                  Intelligent Search
                </h3>
                <p className="text-gray-7">
                  Powered by RAG technology and vector database for instant semantic search and accurate results
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-blue-1 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <MessageSquareIcon size={28} className="text-blue-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-10 mb-3">
                  Private Deployment
                </h3>
                <p className="text-gray-7">
                  Deploy within your infrastructure, ensuring data sovereignty and enterprise security
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-white/50 backdrop-blur-sm border-t border-gray-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-7 text-sm">
            © AI Assistant. Powered by RAG & AI technology.
          </p>
        </div>
      </footer>
    </div>
  )
}