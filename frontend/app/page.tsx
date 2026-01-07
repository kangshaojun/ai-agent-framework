'use client'

import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/services/auth'
import { BotIcon, MessageSquareIcon, SparklesIcon, ZapIcon } from '@/ui/Icons'

export default function HomePage() {
  const router = useRouter()

  const handleStartChat = () => {
    // 检查是否已登录
    if(isAuthenticated()) {
      router.push('/chat')
    } else {
      // 未登录，跳转到登录页面
      router.push('/login')
    }
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
              <span className="text-2xl font-bold text-gray-10">客服助手</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 text-gray-10 hover:text-blue-6 transition-colors font-medium"
              >
                登录
              </button>
              <button
                onClick={() => router.push('/register')}
                className="px-4 py-2 bg-blue-6 rounded-lg hover:bg-blue-7 transition-colors font-medium"
                style={{ color: '#ffffff' }}
              >
                注册
              </button>
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
              客服知识库
              <span className="bg-gradient-to-r from-blue-6 to-blue-7 bg-clip-text text-transparent">
                {' '}智能助手
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-7 mb-12 max-w-2xl mx-auto">
              基于 RAG 技术，整合历史工单知识，帮助客服人员快速查找问题解决方案。
              提升服务效率，保证服务质量的一致性。
            </p>

            {/* CTA Button */}
            <button
              onClick={handleStartChat}
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-6 to-blue-7 text-lg font-semibold rounded-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              style={{ color: '#ffffff' }}
            >
              <MessageSquareIcon size={24} />
              <span>开始对话</span>
            </button>

            {/* Features */}
            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Feature 1 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-blue-1 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <ZapIcon size={28} className="text-blue-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-10 mb-3">
                  快速检索
                </h3>
                <p className="text-gray-7">
                  基于向量数据库，秒级检索相关工单，快速获取解决方案
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-blue-1 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <SparklesIcon size={28} className="text-blue-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-10 mb-3">
                  知识沉淀
                </h3>
                <p className="text-gray-7">
                  自动学习历史工单经验，持续优化服务标准和流程
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-14 h-14 bg-blue-1 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <MessageSquareIcon size={28} className="text-blue-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-10 mb-3">
                  专业建议
                </h3>
                <p className="text-gray-7">
                  基于真实案例提供处理建议，确保服务质量一致性
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
            © 客服知识库助手. Powered by RAG & AI technology.
          </p>
        </div>
      </footer>
    </div>
  )
}