'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/services/auth'
import { BotIcon } from '@/ui/Icons'
import Input from '@/ui/Input'
import { INPUT_PRESETS } from '@/ui/InputPresets'
import { validateField } from '@/utils/validation'

interface FieldErrors {
  username: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    username: '',
    password: '',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target
    setTouched({ ...touched, [name]: true })
    
    const error = validateField(name, formData[name as keyof typeof formData])
    setFieldErrors({ ...fieldErrors, [name]: error })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    if (touched[name]) {
      const error = validateField(name, value)
      setFieldErrors({ ...fieldErrors, [name]: error })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const errors: FieldErrors = {
      username: validateField('username', formData.username),
      password: validateField('password', formData.password),
    }

    setFieldErrors(errors)
    setTouched({
      username: true,
      password: true,
    })

    if (Object.values(errors).some(err => err !== '')) {
      return
    }

    setLoading(true)

    try {
      await login(formData)
      router.push('/chat')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      if (
        errorMessage.includes('用户名或密码错误') ||
        errorMessage.includes('Invalid username or password') ||
        errorMessage.includes('401')
      ) {
        setError('Incorrect username or password, please try again')
      } else if (errorMessage.includes('禁用') || errorMessage.includes('disabled') || errorMessage.includes('403')) {
        setError('This account has been disabled, please contact administrator')
      } else {
        setError('Login failed, please try again later')
      }
    } finally {
      setLoading(false)
    }
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
            Welcome Back
          </h1>
          <p className="text-gray-7">Sign in to AI Assistant</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-md p-8">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="rounded-lg bg-red-1 border border-red-5 p-4">
                <div className="text-sm text-red-6">{error}</div>
              </div>
            )}

            <Input
              id="username"
              name="username"
              {...INPUT_PRESETS.username}
              value={formData.username}
              error={fieldErrors.username}
              touched={touched.username}
              disabled={loading}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            <Input
              id="password"
              name="password"
              {...INPUT_PRESETS.password}
              value={formData.password}
              error={fieldErrors.password}
              touched={touched.password}
              disabled={loading}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-6 text-gray-1 font-medium rounded-lg hover:bg-blue-7 focus:outline-none focus:ring-2 focus:ring-blue-6 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-7">
              Don&apos;t have an account?{' '}
              <a
                href="/register"
                className="font-medium text-blue-6 hover:text-blue-7 transition-colors"
              >
                Sign Up
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-7">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  )
}
