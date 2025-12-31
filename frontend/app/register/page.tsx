'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { register } from '@/services/auth'
import { BotIcon } from '@/ui/Icons'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证密码
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (formData.password.length < 6) {
      setError('密码长度至少为 6 位')
      return
    }

    setLoading(true)

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name || undefined,
      })

      // 注册成功，跳转到登录页
      alert('注册成功！请登录')
      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请重试')
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
          <h1 className="text-3xl font-bold text-gray-10 mb-2">创建账号</h1>
          <p className="text-gray-7">开始使用 DeepSeek AI 助手</p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-md p-8">
          <form className="space-y-4" onSubmit={handleSubmit}>
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
                用户名 <span className="text-red-6">*</span>
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
                htmlFor="email"
                className="block text-sm font-medium text-gray-10 mb-2"
              >
                邮箱 <span className="text-red-6">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-5 rounded-lg text-gray-10 placeholder-gray-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:border-transparent transition-all"
                placeholder="请输入邮箱"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-gray-10 mb-2"
              >
                姓名 <span className="text-gray-7 text-xs">(可选)</span>
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                className="w-full px-4 py-3 border border-gray-5 rounded-lg text-gray-10 placeholder-gray-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:border-transparent transition-all"
                placeholder="请输入姓名"
                value={formData.full_name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-10 mb-2"
              >
                密码 <span className="text-red-6">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-5 rounded-lg text-gray-10 placeholder-gray-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:border-transparent transition-all"
                placeholder="至少 6 位密码"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-10 mb-2"
              >
                确认密码 <span className="text-red-6">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-5 rounded-lg text-gray-10 placeholder-gray-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:border-transparent transition-all"
                placeholder="再次输入密码"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-6 text-gray-1 font-medium rounded-lg hover:bg-blue-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-7">
              已有账号？{' '}
              <a
                href="/login"
                className="font-medium text-blue-6 hover:text-blue-7 transition-colors"
              >
                立即登录
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-7">
          <p>注册即表示您同意我们的服务条款和隐私政策</p>
        </div>
      </div>
    </div>
  )
}
