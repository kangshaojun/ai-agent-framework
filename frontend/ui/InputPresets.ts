/**
 * Common input field presets for reusability
 */

export const INPUT_PRESETS = {
  username: {
    type: 'text' as const,
    label: 'Username',
    placeholder: 'Enter your username',
  },
  email: {
    type: 'text' as const,
    label: 'Email',
    placeholder: 'Enter your email',
  },
  password: {
    type: 'password' as const,
    label: 'Password',
    placeholder: 'At least 6 characters',
  },
  confirmPassword: {
    type: 'password' as const,
    label: 'Confirm Password',
    placeholder: 'Enter password again',
  },
  fullName: {
    type: 'text' as const,
    label: 'Full Name',
    placeholder: 'Enter your full name',
  },
}

/**
 * Validation patterns
 */
export const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  username: /^[a-zA-Z0-9_]+$/,
}

/**
 * Validation rules
 */
export const VALIDATION_RULES = {
  username: {
    minLength: 3,
    maxLength: 50,
    pattern: VALIDATION_PATTERNS.username,
    messages: {
      required: 'Username is required',
      minLength: 'Username must be at least 3 characters',
      maxLength: 'Username cannot exceed 50 characters',
      pattern: 'Username can only contain letters, numbers, and underscores',
    },
  },
  email: {
    pattern: VALIDATION_PATTERNS.email,
    messages: {
      required: 'Email is required',
      pattern: 'Invalid email format',
    },
  },
  password: {
    minLength: 6,
    maxLength: 128,
    messages: {
      required: 'Password is required',
      minLength: 'Password must be at least 6 characters',
      maxLength: 'Password cannot exceed 128 characters',
    },
  },
}
