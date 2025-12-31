import clsx from "clsx"
import React from "react"

export default function Button({
  kind = 'default',
  size = 'normal',
  display = 'inline-flex',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: 'normal' | 'primary' | 'error' | 'default'
  size?: 'normal' | 'small' | 'large'
  display?: 'inline-flex' | 'flex'
}) {
  return (
    <button
      {...props}
      className={clsx(
        'pointer-events-auto relative cursor-pointer items-center justify-center rounded-full text-sm font-medium transition-all duration-300 hover:opacity-85 active:opacity-100',
        props.className,
        {
          'bg-blue-8 text-character-primary-inverse': kind === 'primary',
          'bg-blue-8 text-gray-1': kind === 'normal',
          'bg-red-6 text-red-2': kind === 'error',
          'inline-flex': display === 'inline-flex',
          'flex w-full': display === 'flex',
          'hover:bg-[rgba(19,19,19,0.03)]': kind === 'default',
          'h-10 px-4': size === 'large',
          'h-9 px-4': size === 'normal',
          'h-7.5 px-3 text-xs': size === 'small',
          'pointer-events-none cursor-not-allowed border-character-disabled bg-white-1 !text-character-disabled':
            props.disabled,
        },
      )}
    >
    </button>
  )
}