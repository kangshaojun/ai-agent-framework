export const API_BASE: string = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'
export const MAIN_DOMAIN: string = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost'
export const IS_DEV: boolean = !!process.env.NEXT_PUBLIC_IS_DEV || true