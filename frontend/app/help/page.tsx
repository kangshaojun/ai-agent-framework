'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getHelpContent, HelpContent } from '@/services/help'
import { BookOpenIcon, ArrowLeftIcon } from '@/ui/Icons'

export default function HelpPage() {
  const [helpData, setHelpData] = useState<HelpContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadHelp = async () => {
      try {
        const data = await getHelpContent()
        setHelpData(data)
      } catch (err) {
        setError('加载帮助内容失败')
      } finally {
        setLoading(false)
      }
    }

    loadHelp()
  }, [])

  // Simple markdown parser
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n')
    const elements: JSX.Element[] = []
    let inList = false
    let listItems: JSX.Element[] = []

    const flushList = () => {
      if (inList && listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 mb-4 text-gray-8">
            {listItems}
          </ul>
        )
        listItems = []
        inList = false
      }
    }

    lines.forEach((line, index) => {
      const trimmed = line.trim()

      // Empty line
      if (!trimmed) {
        flushList()
        return
      }

      // H1
      if (trimmed.startsWith('# ')) {
        flushList()
        elements.push(
          <h1 key={index} className="text-2xl font-bold text-gray-10 mt-8 mb-4">
            {trimmed.substring(2)}
          </h1>
        )
        return
      }

      // H2
      if (trimmed.startsWith('## ')) {
        flushList()
        elements.push(
          <h2 key={index} className="text-xl font-semibold text-gray-10 mt-6 mb-3">
            {trimmed.substring(3)}
          </h2>
        )
        return
      }

      // H3
      if (trimmed.startsWith('### ')) {
        flushList()
        elements.push(
          <h3 key={index} className="text-lg font-medium text-gray-10 mt-5 mb-2">
            {trimmed.substring(4)}
          </h3>
        )
        return
      }

      // List item
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        inList = true
        listItems.push(
          <li key={index}>{trimmed.substring(2)}</li>
        )
        return
      }

      // Numbered list item
      if (/^\d+\.\s/.test(trimmed)) {
        flushList()
        const text = trimmed.replace(/^\d+\.\s/, '')
        elements.push(
          <div key={index} className="flex items-start gap-2 mb-2 text-gray-8">
            <span className="text-blue-6 font-medium">•</span>
            <span>{text}</span>
          </div>
        )
        return
      }

      // Quote/Info box
      if (trimmed.startsWith('> ')) {
        flushList()
        elements.push(
          <div key={index} className="bg-blue-1 border-l-4 border-blue-6 p-4 my-4 rounded-r-lg">
            <p className="text-blue-8">{trimmed.substring(2)}</p>
          </div>
        )
        return
      }

      // Divider
      if (trimmed === '---') {
        flushList()
        elements.push(<hr key={index} className="my-6 border-gray-4" />)
        return
      }

      // Bold text **text**
      if (trimmed.includes('**')) {
        flushList()
        const parts = trimmed.split(/(\*\*.*?\*\*)/g)
        const formatted = parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-semibold text-gray-10">{part.slice(2, -2)}</strong>
          }
          return part
        })
        elements.push(<p key={index} className="text-gray-8 leading-relaxed mb-3">{formatted}</p>)
        return
      }

      // Regular paragraph
      flushList()
      elements.push(<p key={index} className="text-gray-8 leading-relaxed mb-3">{trimmed}</p>)
    })

    flushList()
    return elements
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-gray-7">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-6 mb-4">{error}</p>
          <Link href="/chat" className="text-blue-6 hover:underline">
            返回聊天
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-2">
      {/* Header */}
      <header className="bg-white border-b border-gray-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/chat" className="flex items-center space-x-2 text-gray-7 hover:text-gray-10 transition-colors">
              <ArrowLeftIcon size={18} />
              <span className="text-sm">返回</span>
            </Link>
            <div className="flex items-center">
              <BookOpenIcon size={20} className="text-blue-6 mr-2" />
              <h1 className="text-lg font-semibold text-gray-10">{helpData?.title || '帮助中心'}</h1>
            </div>
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-4 p-6 sm:p-8">
          {helpData?.content ? (
            <div className="prose max-w-none">
              {renderMarkdown(helpData.content)}
            </div>
          ) : (
            <p className="text-gray-6 text-center py-12">暂无帮助内容</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-6">
          <p>版本 {helpData?.version || '1.0'}</p>
        </div>
      </main>
    </div>
  )
}
