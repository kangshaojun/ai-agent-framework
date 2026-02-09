import { httpGet } from '@/utils/request'

export interface HelpContent {
  title: string
  content: string
  version: string
}

/**
 * 获取帮助中心内容
 */
export const getHelpContent = async (): Promise<HelpContent> => {
  return httpGet<HelpContent>('/help/content')
}
