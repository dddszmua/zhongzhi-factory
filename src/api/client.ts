import axios from 'axios'
import { getToken, clearToken, clearUsername } from '@/lib/storage'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
const AGENT_BASE = import.meta.env.VITE_AGENT_BASE_URL || ''

export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers['Access-Token'] = token
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status
    const url = String(error?.config?.url || '')
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register')
    if (status === 401 && !isAuthEndpoint) {
      clearToken()
      clearUsername()
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?redirect=${redirect}`
      }
    }
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      '请求失败'
    return Promise.reject(new Error(typeof message === 'string' ? message : '请求失败'))
  },
)

export function agentUrl(path: string) {
  const base = AGENT_BASE || ''
  if (path.startsWith('http')) return path
  if (base) return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
  return path.startsWith('/') ? path : `/${path}`
}

export { API_BASE, AGENT_BASE }
