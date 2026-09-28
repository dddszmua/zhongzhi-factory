import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '@/api/auth'
import type { AuthUser } from '@/api/auth'
import { clearToken, clearUsername, getToken, setToken, setUsername } from '@/lib/storage'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const info = await authApi.getUserInfo()
      setUser(info)
    } catch {
      clearToken()
      clearUsername()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password)
    if (!res?.token) throw new Error('登录失败：未返回令牌')
    setToken(res.token)
    setUsername(res.username)
    setUser(res)
  }, [])

  const register = useCallback(async (username: string, password: string, name?: string) => {
    const res = await authApi.register(username, password, name)
    if (!res?.token) throw new Error('注册失败：未返回令牌')
    setToken(res.token)
    setUsername(res.username)
    setUser(res)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    clearToken()
    clearUsername()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user && getToken()),
      login,
      register,
      logout,
      refresh,
    }),
    [user, loading, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
