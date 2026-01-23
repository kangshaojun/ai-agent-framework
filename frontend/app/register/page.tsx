'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { register } from '@/services/auth'
import { BotIcon } from '@/ui/Icons'
import Input from '@/ui/Input'
import { INPUT_PRESETS } from '@/ui/InputPresets'
import { validateField } from '@/utils/validation'

interface FieldErrors {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target
    setTouched({ ...touched, [name]: true })
    
    const error = validateField(name, formData[name as keyof typeof formData], { password: formData.password })
    setFieldErrors({ ...fieldErrors, [name]: error })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })

    if (touched[name]) {
      const error = validateField(name, value, { password: formData.password })
      setFieldErrors({ ...fieldErrors, [name]: error })
    }

    if (name === 'password' && touched.confirmPassword && formData.confirmPassword) {
      const confirmError = validateField('confirmPassword', formData.confirmPassword, { password: value })
      setFieldErrors({ ...fieldErrors, [name]: '', confirmPassword: confirmError })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const errors: FieldErrors = {
      username: validateField('username', formData.username),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
      confirmPassword: validateField('confirmPassword', formData.confirmPassword, { password: formData.password }),
    }

    setFieldErrors(errors)
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
    })

    if (Object.values(errors).some(err => err !== '')) {
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

      alert('Registration successful! Please sign in')
      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed, please try again')
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
          <h1 className="text-3xl font-bold text-gray-10 mb-2">Create Account</h1>
          <p className="text-gray-7">Start using AI Assistant</p>
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-md p-8">
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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
              required
              disabled={loading}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            <Input
              id="email"
              name="email"
              {...INPUT_PRESETS.email}
              value={formData.email}
              error={fieldErrors.email}
              touched={touched.email}
              required
              disabled={loading}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            <Input
              id="full_name"
              name="full_name"
              {...INPUT_PRESETS.fullName}
              label="Full Name (Optional)"
              value={formData.full_name}
              disabled={loading}
              onChange={handleChange}
            />

            <Input
              id="password"
              name="password"
              {...INPUT_PRESETS.password}
              value={formData.password}
              error={fieldErrors.password}
              touched={touched.password}
              required
              disabled={loading}
              onChange={handleChange}
              onBlur={handleBlur}
            />

            <Input
              id="confirmPassword"
              name="confirmPassword"
              {...INPUT_PRESETS.confirmPassword}
              value={formData.confirmPassword}
              error={fieldErrors.confirmPassword}
              touched={touched.confirmPassword}
              required
              disabled={loading}
              onChange={handleChange}
              onBlur={handleBlur}
            />

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
