# JWT认证在Next.js中的最佳实践

## 前言

JWT（JSON Web Token）是现代Web应用中最流行的认证方案。本文将介绍如何在Next.js中实现安全、高效的JWT认证系统。

**适合读者：** 前端开发者、全栈工程师、安全工程师

---

## 一、JWT基础

### 1.1 JWT结构

```
JWT = Header.Payload.Signature

Header (头部):
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload (负载):
{
  "user_id": 123,
  "username": "alice",
  "exp": 1735689600,
  "type": "access"
}

Signature (签名):
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

### 1.2 双Token机制

```
Access Token:
- 短期有效（30分钟）
- 用于API请求
- 存储在内存或localStorage

Refresh Token:
- 长期有效（7天）
- 用于刷新Access Token
- 存储在httpOnly Cookie（更安全）
```

---

## 二、认证流程设计

### 2.1 完整认证流程

```
1. 用户登录
   ↓
2. 服务器验证用户名密码
   ↓
3. 生成Access Token + Refresh Token
   ↓
4. 返回Token给客户端
   ↓
5. 客户端存储Token
   ↓
6. 后续请求携带Access Token
   ↓
7. Access Token过期
   ↓
8. 使用Refresh Token刷新
   ↓
9. 获取新的Access Token
   ↓
10. 继续使用
```

### 2.2 Token刷新流程

```
请求API
   ↓
Access Token有效? ─Yes→ 返回数据
   ↓ No
401 Unauthorized
   ↓
自动刷新Token
   ↓
Refresh Token有效? ─Yes→ 获取新Access Token → 重试请求
   ↓ No
跳转登录页
```

---

## 三、认证服务实现

### 3.1 Token管理

```typescript
// lib/token-manager.ts
const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export class TokenManager {
  // 存储Token
  static setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return
    
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }

  // 获取Access Token
  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  }

  // 获取Refresh Token
  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  // 清除Token
  static clearTokens(): void {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  // 检查是否已认证
  static isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }

  // 解析Token
  static parseToken(token: string): any {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch {
      return null
    }
  }

  // 检查Token是否过期
  static isTokenExpired(token: string): boolean {
    const payload = this.parseToken(token)
    if (!payload || !payload.exp) return true
    
    return Date.now() >= payload.exp * 1000
  }
}
```

### 3.2 认证API服务

```typescript
// services/auth.service.ts
import axios from 'axios'
import { TokenManager } from '@/lib/token-manager'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  full_name?: string
}

export interface User {
  id: number
  username: string
  email: string
  full_name?: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}

export class AuthService {
  // 登录
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await axios.post(`${API_URL}/api/auth/login`, credentials)
    const data = response.data.data

    // 存储Token
    TokenManager.setTokens(data.access_token, data.refresh_token)

    return data
  }

  // 注册
  async register(data: RegisterData): Promise<User> {
    const response = await axios.post(`${API_URL}/api/auth/register`, data)
    return response.data.data
  }

  // 获取当前用户
  async getCurrentUser(): Promise<User> {
    const token = TokenManager.getAccessToken()
    if (!token) {
      throw new Error('未登录')
    }

    const response = await axios.get(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    return response.data.data
  }

  // 刷新Token
  async refreshToken(): Promise<string> {
    const refreshToken = TokenManager.getRefreshToken()
    if (!refreshToken) {
      throw new Error('无Refresh Token')
    }

    const response = await axios.post(`${API_URL}/api/auth/refresh`, {
      refresh_token: refreshToken
    })

    const newAccessToken = response.data.data.access_token
    const newRefreshToken = response.data.data.refresh_token

    // 更新Token
    TokenManager.setTokens(newAccessToken, newRefreshToken)

    return newAccessToken
  }

  // 登出
  async logout(): Promise<void> {
    try {
      const token = TokenManager.getAccessToken()
      if (token) {
        await axios.post(
          `${API_URL}/api/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )
      }
    } finally {
      TokenManager.clearTokens()
    }
  }
}

export const authService = new AuthService()
```

---

## 四、Axios拦截器

### 4.1 请求拦截器

```typescript
// lib/axios-instance.ts
import axios, { AxiosInstance, AxiosError } from 'axios'
import { TokenManager } from './token-manager'
import { authService } from '@/services/auth.service'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// 创建Axios实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    const token = TokenManager.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  failedQueue = []
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config

    // 401错误且未重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 正在刷新Token，将请求加入队列
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return axiosInstance(originalRequest)
          })
          .catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // 刷新Token
        const newToken = await authService.refreshToken()
        
        // 更新原始请求的Token
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        
        // 处理队列中的请求
        processQueue(null, newToken)
        
        // 重试原始请求
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        // 刷新失败，清除Token并跳转登录
        processQueue(refreshError, null)
        TokenManager.clearTokens()
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
```

---

## 五、React Hooks

### 5.1 useAuth Hook

```typescript
// hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/services/auth.service'
import { TokenManager } from '@/lib/token-manager'
import type { User, LoginCredentials } from '@/services/auth.service'

interface UseAuthReturn {
  user: User | null
  loading: boolean
  error: Error | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // 检查认证状态
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      if (!TokenManager.isAuthenticated()) {
        setLoading(false)
        return
      }

      const userData = await authService.getCurrentUser()
      setUser(userData)
      setError(null)
    } catch (err) {
      setError(err as Error)
      TokenManager.clearTokens()
    } finally {
      setLoading(false)
    }
  }

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)

      const response = await authService.login(credentials)
      setUser(response.user)

      router.push('/chat')
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [router])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
      setUser(null)
      router.push('/login')
    } catch (err) {
      setError(err as Error)
    }
  }, [router])

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user
  }
}
```

### 5.2 useRequireAuth Hook

```typescript
// hooks/useRequireAuth.ts
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './useAuth'

export function useRequireAuth(redirectTo = '/login') {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push(redirectTo)
    }
  }, [isAuthenticated, loading, router, redirectTo])

  return { isAuthenticated, loading }
}
```

---

## 六、路由保护

### 6.1 客户端路由保护

```typescript
// app/chat/page.tsx
'use client'

import { useRequireAuth } from '@/hooks/useRequireAuth'

export default function ChatPage() {
  const { loading } = useRequireAuth()

  if (loading) {
    return <div>加载中...</div>
  }

  return (
    <div>
      {/* 聊天界面 */}
    </div>
  )
}
```

### 6.2 高阶组件保护

```typescript
// components/withAuth.tsx
import { ComponentType } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'

export function withAuth<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { loading } = useRequireAuth()

    if (loading) {
      return <div>加载中...</div>
    }

    return <Component {...props} />
  }
}

// 使用示例
const ProtectedPage = withAuth(ChatPage)
```

### 6.3 中间件保护（Next.js 13+）

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value

  // 保护的路由
  const protectedPaths = ['/chat', '/profile', '/settings']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/chat/:path*', '/profile/:path*', '/settings/:path*']
}
```

---

## 七、登录页面实现

### 7.1 登录表单

```typescript
// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login({ username, password })
      // 登录成功，useAuth会自动跳转
    } catch (err: any) {
      setError(err.response?.data?.msg || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center text-gray-900">
            登录
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="text-center">
          <a href="/register" className="text-sm text-blue-600 hover:text-blue-500">
            还没有账号？立即注册
          </a>
        </div>
      </div>
    </div>
  )
}
```

---

## 八、安全最佳实践

### 8.1 XSS防护

```typescript
// 不要在localStorage中存储敏感信息
// ❌ 不好
localStorage.setItem('user_password', password)

// ✅ 好
// 只存储Token，不存储密码等敏感信息
```

### 8.2 CSRF防护

```typescript
// 使用httpOnly Cookie存储Refresh Token
// 服务端设置
res.cookie('refresh_token', refreshToken, {
  httpOnly: true,  // 防止JavaScript访问
  secure: true,    // 只在HTTPS下传输
  sameSite: 'strict',  // 防止CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7天
})
```

### 8.3 Token过期处理

```typescript
// 定期检查Token是否即将过期
useEffect(() => {
  const checkTokenExpiry = () => {
    const token = TokenManager.getAccessToken()
    if (!token) return

    if (TokenManager.isTokenExpired(token)) {
      // Token已过期，尝试刷新
      authService.refreshToken().catch(() => {
        // 刷新失败，跳转登录
        router.push('/login')
      })
    }
  }

  // 每分钟检查一次
  const interval = setInterval(checkTokenExpiry, 60000)
  return () => clearInterval(interval)
}, [])
```

---

## 九、总结

JWT认证的核心要点：

✅ **双Token机制** - Access + Refresh Token  
✅ **自动刷新** - 拦截器自动处理过期  
✅ **路由保护** - 未认证自动跳转  
✅ **安全存储** - httpOnly Cookie + localStorage  
✅ **错误处理** - 优雅处理认证失败  

**下一篇预告：** 《FastAPI异步编程：高性能API服务的秘密》

---

**作者简介：** 资深开发者，创业者。专注于视频通讯技术领域。国内首本Flutter著作《Flutter技术入门与实战》作者,另著有《Dart语言实战》及《WebRTC音视频开发》等书籍。多年从事视频会议、远程教育等技术研发，对于Android、iOS以及跨平台开发技术有比较深入的研究和应用，作为主要程序员开发了多个应用项目，涉及医疗、交通、银行等领域。

**学习资料：**
- [ai-agent-framework](https://www.bilibili.com/cheese/play/ep2187729)
- [作者GitHub](https://github.com/kangshaojun)

**欢迎交流：** 如有问题欢迎在评论区讨论 🚀
