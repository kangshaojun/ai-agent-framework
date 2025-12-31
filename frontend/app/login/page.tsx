'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/services/auth'
import { BotIcon } from '@/ui/Icons'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(formData)
      // 登录成功，跳转到聊天页面
      router.push('/chat')
    } catch (err) {
      // 显示友好的错误提示
      const errorMessage = err instanceof Error ? err.message : '登录失败'
      if (
        errorMessage.includes('用户名或密码错误') ||
        errorMessage.includes('401')
      ) {
        setError('用户名或密码错误，请重试')
      } else if (errorMessage.includes('禁用') || errorMessage.includes('403')) {
        setError('该账号已被禁用，请联系管理员')
      } else {
        setError('登录失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-2 py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-6 rounded-2xl mb-4">
            <BotIcon size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-10 mb-2">
            欢迎回来
          </h1>
          <p className="text-gray-7">登录到 My AI 助手</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-md p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg bg-red-1 border border-red-5 p-4">
                <div className="text-sm text-red-6">{error}</div>
              </div>
            )}

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-10 mb-2"
              >
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-5 rounded-lg text-gray-10 placeholder-gray-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:border-transparent transition-all"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-10 mb-2"
              >
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-5 rounded-lg text-gray-10 placeholder-gray-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:border-transparent transition-all"
                placeholder="请输入密码"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-6 text-gray-1 font-medium rounded-lg hover:bg-blue-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-7">
              还没有账号？{' '}
              <a
                href="/register"
                className="font-medium text-blue-6 hover:text-blue-7 transition-colors"
              >
                立即注册
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-7">
          <p>登录即表示您同意我们的服务条款和隐私政策</p>
        </div>
      </div>
    </div>
  )
}
