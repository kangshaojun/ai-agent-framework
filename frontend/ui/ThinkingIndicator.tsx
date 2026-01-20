import React from 'react'

export const ThinkingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-2 text-gray-7">
      <div className="flex space-x-1">
        <div
          className="w-2 h-2 bg-blue-6 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="w-2 h-2 bg-blue-6 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <div
          className="w-2 h-2 bg-blue-6 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="text-sm">Thinking...</span>
    </div>
  )
}
