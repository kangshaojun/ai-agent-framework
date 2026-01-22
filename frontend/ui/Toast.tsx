import React, { useState, useEffect, ReactNode } from 'react'
import clsx from 'clsx'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  icon?: ReactNode
}

interface ToastItem extends ToastProps {
  id: string
}

let toastCount = 0
const toastListeners: Array<(toast: ToastItem) => void> = []

/**
 * Toast notification component
 * 
 * Usage:
 * import { toast } from '@/ui/Toast'
 * 
 * toast.success('操作成功')
 * toast.error('操作失败')
 * toast.info('提示信息')
 */
export const Toast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const listener = (toast: ToastItem) => {
      setToasts((prev) => [...prev, toast])

      // Auto remove after duration
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, toast.duration || 3000)
    }

    toastListeners.push(listener)

    return () => {
      const index = toastListeners.indexOf(listener)
      if (index > -1) {
        toastListeners.splice(index, 1)
      }
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'flex items-center space-x-3 rounded-lg px-4 py-3 shadow-lg transition-all duration-300 animate-slide-in min-w-[300px]',
            {
              'bg-green-50 text-green-800 border border-green-200': toast.type === 'success',
              'bg-red-50 text-red-800 border border-red-200': toast.type === 'error',
              'bg-blue-50 text-blue-800 border border-blue-200': toast.type === 'info',
            }
          )}
        >
          {toast.icon && <span className="flex-shrink-0">{toast.icon}</span>}
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}

// Toast API
const showToast = (props: ToastProps) => {
  const id = `toast-${++toastCount}`
  const toast: ToastItem = { ...props, id }
  
  toastListeners.forEach((listener) => listener(toast))
}

export const toast = {
  success: (message: string, duration?: number) => {
    showToast({ message, type: 'success', duration })
  },
  error: (message: string, duration?: number) => {
    showToast({ message, type: 'error', duration })
  },
  info: (message: string, duration?: number) => {
    showToast({ message, type: 'info', duration })
  },
}
