import { apiClient } from './client'

export interface AuthUser {
  id: string
  name: string
  username: string
  token?: string
  avatar?: string
  roleId?: string
  role?: { id?: string; name?: string; permissionList?: string[] }
}

export async function login(username: string, password: string): Promise<AuthUser> {
  return apiClient.post<AuthUser, AuthUser>('/auth/login', { username, password })
}

export async function register(username: string, password: string, name?: string): Promise<AuthUser> {
  return apiClient.post<AuthUser, AuthUser>('/auth/register', { username, password, name: name || username })
}

export async function getUserInfo(): Promise<AuthUser> {
  const res = await apiClient.get<AuthUser & { result?: AuthUser }, AuthUser & { result?: AuthUser }>('/auth/info')
  // 后端包装为 { code, result }
  if (res?.result) return res.result
  return res
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout')
  } catch {
    // ignore
  }
}
