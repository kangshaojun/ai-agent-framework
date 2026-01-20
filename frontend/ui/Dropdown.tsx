import React, { useState, useRef, useEffect, ReactNode } from 'react'

interface DropdownProps {
  trigger: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Dropdown component with built-in click-outside-to-close functionality
 * Similar to Headless UI Menu component
 * 
 * Usage:
 * <Dropdown trigger={<button>Click me</button>}>
 *   <button onClick={handleAction1}>Action 1</button>
 *   <button onClick={handleAction2}>Action 2</button>
 * </Dropdown>
 */
export const Dropdown: React.FC<DropdownProps> = ({ trigger, children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <div onClick={handleTriggerClick}>
        {trigger}
      </div>
      
      {isOpen && (
        <div className={`absolute right-0 top-8 rounded-lg shadow-2xl border border-gray-4 py-2 z-[9999] min-w-[140px] bg-white ${className}`}>
          <div onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  onClick?: (e: React.MouseEvent) => void
  icon?: ReactNode
  children: ReactNode
  className?: string
  variant?: 'default' | 'danger'
}

/**
 * Dropdown item component
 */
export const DropdownItem: React.FC<DropdownItemProps> = ({ 
  onClick, 
  icon, 
  children, 
  className = '',
  variant = 'default'
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(e)
  }

  const variantClasses = {
    default: 'hover:bg-gray-2 text-gray-10',
    danger: 'hover:bg-red-1 text-red-6'
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 text-base ${variantClasses[variant]} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}
