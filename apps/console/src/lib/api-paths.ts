/**
 * Memai API 路径常量
 */

export const AUTH_API = {
  SIGN_IN: '/api/auth/sign-in/email',
  SIGN_UP: '/api/auth/sign-up/email',
  SIGN_OUT: '/api/auth/sign-out',
  SESSION: '/api/auth/get-session',
} as const

export const USER_API = {
  ME: '/api/user/me',
} as const

export const PAYMENT_API = {
  SUBSCRIPTION: '/api/payment/subscription',
  QUOTA: '/api/payment/quota',
} as const

export const CONSOLE_API = {
  API_KEYS: '/api/console/api-keys',
  WEBHOOKS: '/api/console/webhooks',
  ENTITIES: '/api/console/entities',
  MEMORIES: '/api/console/memories',
  STATS: '/api/console/stats',
} as const

export const PUBLIC_API = {
  MEMORIES: '/api/v1/memories',
  ENTITIES: '/api/v1/entities',
  QUOTA: '/api/v1/quota',
} as const

export const HEALTH_API = {
  BASE: '/health',
} as const

export const ADMIN_API = {
  LOGIN: '/api/admin/login',
  LOGOUT: '/api/admin/logout',
} as const
