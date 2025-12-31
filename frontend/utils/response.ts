/**
 * 响应处理辅助函数
 * 
 * 提供便捷的响应数据提取和错误处理方法
 */

import { ApiResponse } from './request'
import { isSuccess } from './errorCodes'

/**
 * 从响应中提取数据
 * 如果响应为空或失败，返回默认值
 */
export function extractData<T>(
  response: ApiResponse<T> | null,
  defaultValue: T
): T {
  if (!response || !isSuccess(response.code)) {
    return defaultValue
  }
  return response.data ?? defaultValue
}

/**
 * 从响应中提取数组数据
 * 如果响应为空或失败，返回空数组
 */
export function extractList<T>(
  response: ApiResponse<T[]> | null
): T[] {
  return extractData(response, [])
}

/**
 * 检查响应是否成功
 */
export function checkSuccess(response: ApiResponse | null): boolean {
  return response !== null && isSuccess(response.code)
}

/**
 * 获取响应错误消息
 */
export function getErrorMsg(
  response: ApiResponse | null,
  defaultMsg: string = '操作失败'
): string {
  if (!response) {
    return defaultMsg
  }
  return response.msg || defaultMsg
}

/**
 * 安全地执行异步请求，捕获错误并返回结果
 */
export async function safeRequest<T>(
  requestFn: () => Promise<ApiResponse<T> | null>,
  onError?: (error: Error) => void
): Promise<ApiResponse<T> | null> {
  try {
    return await requestFn()
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error)
    }
    return null
  }
}

/**
 * 批量请求辅助函数
 */
export async function batchRequest<T>(
  requests: Array<() => Promise<ApiResponse<T> | null>>
): Promise<Array<ApiResponse<T> | null>> {
  return Promise.all(requests.map(req => safeRequest(req)))
}
