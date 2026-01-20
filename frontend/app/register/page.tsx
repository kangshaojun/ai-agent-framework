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
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
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
      alert('Registration successful! Please sign in')
      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed, please try again')
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
          <h1 className="text-3xl font-bold text-gray-10 mb-2">Create Account</h1>
          <p className="text-gray-7">Start using AI Assistant</p>
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
                Username <span className="text-red-6">*</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-5 rounded-lg text-gray-10 placeholder-gray-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:border-transparent transition-all"
                placeholder="Enter your username"
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
                Email <span className="text-red-6">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-5 rounded-lg text-gray-10 placeholder-gray-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:border-transparent transition-all"
                placeholder="Enter your email"
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
                Full Name <span className="text-gray-7 text-xs">(Optional)</span>
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                className="w-full px-4 py-3 border border-gray-5 rounded-lg text-gray-10 placeholder-gray-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:border-transparent transition-all"
                placeholder="Enter your full name"
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
                Password <span className="text-red-6">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-5 rounded-lg text-gray-10 placeholder-gray-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:border-transparent transition-all"
                placeholder="At least 6 characters"
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
                Confirm Password <span className="text-red-6">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-5 rounded-lg text-gray-10 placeholder-gray-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:border-transparent transition-all"
                placeholder="Enter password again"
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
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-7">
              Already have an account?{' '}
              <a
                href="/login"
                className="font-medium text-blue-6 hover:text-blue-7 transition-colors"
              >
                Sign In
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-7">
          <p>By signing up, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  )
}
