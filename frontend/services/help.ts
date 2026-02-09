import { httpGet } from '@/utils/request'

export interface HelpContent {
  title: string
  content: string
  version: string
}

/**
 * Get help center content
 */
export const getHelpContent = async (): Promise<HelpContent> => {
  const response = await httpGet<HelpContent>('/help/content')
  if (response?.code === 0 && response.data) {
    return response.data
  }
  throw new Error(response?.msg || '获取帮助内容失败')
}
