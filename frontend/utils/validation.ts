/**
 * Form validation utilities
 */

import { VALIDATION_RULES } from '@/ui/InputPresets'

/**
 * Validate username field
 */
export function validateUsername(value: string): string {
  const rules = VALIDATION_RULES.username

  if (!value.trim()) {
    return rules.messages.required
  }
  if (value.length < rules.minLength) {
    return rules.messages.minLength
  }
  if (value.length > rules.maxLength) {
    return rules.messages.maxLength
  }
  if (!rules.pattern.test(value)) {
    return rules.messages.pattern
  }
  return ''
}

/**
 * Validate email field
 */
export function validateEmail(value: string): string {
  const rules = VALIDATION_RULES.email

  if (!value.trim()) {
    return rules.messages.required
  }
  if (!rules.pattern.test(value)) {
    return rules.messages.pattern
  }
  return ''
}

/**
 * Validate password field
 */
export function validatePassword(value: string): string {
  const rules = VALIDATION_RULES.password

  if (!value) {
    return rules.messages.required
  }
  if (value.length < rules.minLength) {
    return rules.messages.minLength
  }
  if (value.length > rules.maxLength) {
    return rules.messages.maxLength
  }
  return ''
}

/**
 * Validate confirm password field
 */
export function validateConfirmPassword(value: string, password: string): string {
  if (!value) {
    return 'Please confirm your password'
  }
  if (value !== password) {
    return 'Passwords do not match'
  }
  return ''
}

/**
 * Generic field validator
 */
export function validateField(
  name: string,
  value: string,
  extraData?: { password?: string }
): string {
  switch (name) {
    case 'username':
      return validateUsername(value)
    case 'email':
      return validateEmail(value)
    case 'password':
      return validatePassword(value)
    case 'confirmPassword':
      return validateConfirmPassword(value, extraData?.password || '')
    default:
      return ''
  }
}

/**
 * Validate multiple fields at once
 */
export function validateFields(
  fields: Record<string, string>,
  extraData?: { password?: string }
): Record<string, string> {
  const errors: Record<string, string> = {}

  Object.keys(fields).forEach((name) => {
    const error = validateField(name, fields[name], extraData)
    if (error) {
      errors[name] = error
    }
  })

  return errors
}
