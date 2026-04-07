const FALLBACK_API_BASE_URL = 'http://localhost:3000'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export const API_BASE_URL = (configuredBaseUrl || FALLBACK_API_BASE_URL).replace(/\/$/, '')

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  ADMIN: {
    ME: '/admin/me',
  },
  PATIENTS: {
    BASE: '/patients',
  },
  CERTIFICATES: {
    BASE: '/certificates',
    BY_DATE: '/certificates/by-date',
  },
  ORDONNANCES: {
    BASE: '/ordonnances',
    BY_DATE: '/ordonnances/by-date',
  },
  ANALYZES: {
    BASE: '/analyzes',
    BY_DATE: '/analyzes/by-date',
  },
} as const

export const HTTP_STATUS = {
  UNAUTHORIZED: 401,
} as const
