import React from 'react'

interface InputProps {
  id: string
  name: string
  type?: 'text' | 'password' | 'email'
  label: string
  placeholder?: string
  value: string
  error?: string
  touched?: boolean
  required?: boolean
  disabled?: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}

export default function Input({
  id,
  name,
  type = 'text',
  label,
  placeholder,
  value,
  error,
  touched = false,
  required = false,
  disabled = false,
  onChange,
  onBlur,
}: InputProps) {
  const showError = error && touched

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-10 mb-2"
      >
        {label} {required && <span className="text-red-6">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        className={`w-full px-4 py-3 border rounded-lg text-gray-10 placeholder-gray-7 focus:outline-none focus:ring-2 transition-all ${
          showError
            ? 'border-red-5 focus:ring-red-5 focus:border-red-5'
            : 'border-gray-5 focus:ring-blue-6 focus:border-transparent'
        }`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
      />
      {showError && (
        <p className="mt-1 text-sm text-red-6">{error}</p>
      )}
    </div>
  )
}
