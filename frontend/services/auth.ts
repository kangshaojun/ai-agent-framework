import { httpPost, httpGet } from '@/utils/request'

// 用户信息类型
export interface User {
  id: number
  username: string
  email: string
  full_name: string | null
  is_active: boolean
  is_superuser: boolean
  created_at: string
  updated_at: string
}

// 登录请求
export interface LoginRequest {
  username: string
  password: string
}

// 登录响应
export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

// 注册请求
export interface RegisterRequest {
  username: string
  email: string
  password: string
  full_name?: string
}

// 注册响应
export type RegisterResponse = User

/**
 * 用户登录
 */
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await httpPost<LoginResponse>('/users/login', data)
  if (response?.data) {
    // 保存 token 到 localStorage
    localStorage.setItem('access_token', response.data.access_token)
    localStorage.setItem('refresh_token', response.data.refresh_token)
    return response.data
  }
  throw new Error(response?.msg || '登录失败')
}

/**
 * 用户注册
 */
export const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const response = await httpPost<RegisterResponse>('/users/register', data)
  if (response?.data) {
    return response.data
  }
  throw new Error(response?.msg || '注册失败')
}

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await httpGet<User>('/users/me')
  if (response?.data) {
    return response.data
  }
  throw new Error(response?.msg || '获取用户信息失败')
}

/**
 * 退出登录
 */
export const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

/**
 * 检查是否已登录
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token')
}
