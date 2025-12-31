/**
 * 业务错误码定义
 * 
 * 参考项目的错误码规范:
 * - 0: 成功
 * - 1000: 参数错误
 * - 1001: 业务逻辑错误
 * - 1002: 数据处理错误
 * - 其他: 自定义业务错误
 */

export enum ErrorCode {
  // 成功
  SUCCESS = 0,

  // 通用错误 (1000-1099)
  PARAM_ERROR = 1000, // 参数错误
  BUSINESS_ERROR = 1001, // 业务逻辑错误
  DATA_ERROR = 1002, // 数据处理错误
  PERMISSION_DENIED = 1003, // 权限不足
  RESOURCE_NOT_FOUND = 1004, // 资源不存在
  OPERATION_FAILED = 1005, // 操作失败

  // 用户相关错误 (1100-1199)
  USER_NOT_FOUND = 1100, // 用户不存在
  USER_ALREADY_EXISTS = 1101, // 用户已存在
  USER_DISABLED = 1102, // 用户已禁用
  INVALID_CREDENTIALS = 1103, // 凭证无效
  TOKEN_EXPIRED = 1104, // Token 过期
  TOKEN_INVALID = 1105, // Token 无效

  // 对话相关错误 (1200-1299)
  CONVERSATION_NOT_FOUND = 1200, // 对话不存在
  CONVERSATION_ACCESS_DENIED = 1201, // 无权访问该对话
  MESSAGE_SEND_FAILED = 1202, // 消息发送失败
  MESSAGE_NOT_FOUND = 1203, // 消息不存在

  // 数据库相关错误 (1300-1399)
  DATABASE_ERROR = 1300, // 数据库错误
  DATABASE_CONNECTION_ERROR = 1301, // 数据库连接错误
  DUPLICATE_ENTRY = 1302, // 重复条目

  // 外部服务错误 (1400-1499)
  EXTERNAL_SERVICE_ERROR = 1400, // 外部服务错误
  MCP_SERVICE_ERROR = 1401, // MCP 服务错误
  API_CALL_FAILED = 1402, // API 调用失败
}

// 错误码对应的默认消息
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: 'success',
  [ErrorCode.PARAM_ERROR]: '参数错误',
  [ErrorCode.BUSINESS_ERROR]: '业务逻辑错误',
  [ErrorCode.DATA_ERROR]: '数据处理错误',
  [ErrorCode.PERMISSION_DENIED]: '权限不足',
  [ErrorCode.RESOURCE_NOT_FOUND]: '资源不存在',
  [ErrorCode.OPERATION_FAILED]: '操作失败',
  [ErrorCode.USER_NOT_FOUND]: '用户不存在',
  [ErrorCode.USER_ALREADY_EXISTS]: '用户已存在',
  [ErrorCode.USER_DISABLED]: '用户已禁用',
  [ErrorCode.INVALID_CREDENTIALS]: '用户名或密码错误',
  [ErrorCode.TOKEN_EXPIRED]: 'Token 已过期',
  [ErrorCode.TOKEN_INVALID]: 'Token 无效',
  [ErrorCode.CONVERSATION_NOT_FOUND]: '对话不存在',
  [ErrorCode.CONVERSATION_ACCESS_DENIED]: '无权访问该对话',
  [ErrorCode.MESSAGE_SEND_FAILED]: '消息发送失败',
  [ErrorCode.MESSAGE_NOT_FOUND]: '消息不存在',
  [ErrorCode.DATABASE_ERROR]: '数据库错误',
  [ErrorCode.DATABASE_CONNECTION_ERROR]: '数据库连接错误',
  [ErrorCode.DUPLICATE_ENTRY]: '数据已存在',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
  [ErrorCode.MCP_SERVICE_ERROR]: 'MCP 服务错误',
  [ErrorCode.API_CALL_FAILED]: 'API 调用失败',
}

/**
 * 获取错误码对应的默认消息
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] || '未知错误'
}

/**
 * 判断是否为成功响应
 */
export function isSuccess(code: number): boolean {
  return code === ErrorCode.SUCCESS
}

/**
 * 判断是否为参数错误
 */
export function isParamError(code: number): boolean {
  return code === ErrorCode.PARAM_ERROR
}

/**
 * 判断是否为业务错误
 */
export function isBusinessError(code: number): boolean {
  return code >= 1000
}

/**
 * 判断是否为认证错误
 */
export function isAuthError(code: number): boolean {
  return code >= 1100 && code < 1200
}
