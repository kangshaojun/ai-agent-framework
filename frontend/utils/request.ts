import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'
import { API_BASE } from 'config'
import { isAuthError, isSuccess } from './errorCodes'

export type JSONValue = string | string[] | number | number[] | boolean | JSONObject | JSONArray

export type JSONObject = {
  [x: string]: JSONValue
}

export type JSONArray = JSONObject[]

/**
 * API 响应结构
 * 
 * 参考 项目的响应规范:
 * - code: 业务状态码 (0=成功, >1000=业务错误)
 * - msg: 提示信息
 * - data: 业务数据
 */
export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T | null
}

/**
 * HTTP 请求方法类型
 * 
 * 注意：响应拦截器会自动处理 code !== 0 的情况，并返回 data.data
 * 所以这些方法直接返回 T，不需要再判断 code
 */
export type HttpMethod = <T = unknown>(url: string, data?: unknown) => Promise<T>

// 创建 axios 实例
const request = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 自动添加 token
request.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一处理业务错误码和 token 刷新
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const data = response.data as ApiResponse
    
    // 检查业务状态码
    if (data && typeof data.code === 'number') {
      // 如果是认证错误，清除 token 并跳转登录页
      if (isAuthError(data.code)) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(new Error(data.msg || '认证失败'))
      }
      
      // 如果不是成功状态，返回错误
      if (!isSuccess(data.code)) {
        return Promise.reject(new Error(data.msg || '请求失败'))
      }
      
      // ✅ 成功时只返回 data 字段，上层不再需要做 code 判断
      return data.data
    }
    
    return response.data
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // 如果是登录或注册接口，直接返回错误，不尝试刷新 token
    const isAuthEndpoint = originalRequest.url?.includes('/login') || 
                          originalRequest.url?.includes('/register') ||
                          originalRequest.url?.includes('/refresh')
    
    // 如果是 401 错误且不是认证接口且还没重试过，尝试刷新 token
    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        // 刷新 token
        const response = await axios.post(
          `${API_BASE}/users/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        )

        const { access_token, refresh_token } = response.data.data
        
        // 保存新的 tokens
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)

        // 重试原始请求
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`
        }
        return request(originalRequest)
      } catch (refreshError) {
        // 刷新失败，清除 token 并跳转到登录页
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        
        // 跳转到登录页
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        
        return Promise.reject(refreshError)
      }
    }

    // 提取后端返回的错误信息
    const backendError = error.response?.data as ApiResponse | { detail?: string } | undefined
    let errorMessage = error.message
    
    if (backendError && 'msg' in backendError) {
      errorMessage = backendError.msg || errorMessage
    } else if (backendError && 'detail' in backendError) {
      errorMessage = backendError.detail || errorMessage
    }
    
    // 返回包含错误信息的 Promise rejection
    return Promise.reject(new Error(errorMessage))
  }
)

// 封装常用方法 - 拦截器已处理 code 判断，直接返回 data

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const httpGet = <T = unknown>(url: string, params?: any): Promise<T> => {
  return request.get(url, { params }) as Promise<T>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const httpPost = <T = unknown>(url: string, data?: any): Promise<T> => {
  return request.post(url, data) as Promise<T>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const httpPut = <T = unknown>(url: string, data?: any): Promise<T> => {
  return request.put(url, data) as Promise<T>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const httpDelete = <T = unknown>(url: string, params?: any): Promise<T> => {
  return request.delete(url, { params }) as Promise<T>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const httpPatch = <T = unknown>(url: string, data?: any): Promise<T> => {
  return request.patch(url, data) as Promise<T>
}

export default request
