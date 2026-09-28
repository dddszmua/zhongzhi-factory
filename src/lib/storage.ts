import { ACCESS_TOKEN_KEY, USERNAME_KEY } from './constants'

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

type StoredToken = { value: string; expiresAt: number }

export function getToken(): string | null {
  try {
    const raw = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredToken
    if (!parsed?.value) return null
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      clearToken()
      return null
    }
    return parsed.value
  } catch {
    // 兼容直接存字符串
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  }
}

export function setToken(token: string) {
  const payload: StoredToken = {
    value: token,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  }
  localStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify(payload))
}

export function clearToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function getUsername(): string | null {
  return localStorage.getItem(USERNAME_KEY)
}

export function setUsername(username: string) {
  localStorage.setItem(USERNAME_KEY, username)
}

export function clearUsername() {
  localStorage.removeItem(USERNAME_KEY)
}
