import { apiClient } from './client'
import { ALGORITHM_MODEL_TYPE, onlyAlgorithmModels, type BackendService } from '@/lib/mappers'

type ListResponse = {
  status?: string
  message?: string
  services?: BackendService[]
  total?: number
  service?: BackendService
}

export async function filterServices(params: Record<string, string | number | undefined> = {}) {
  const res: ListResponse = await apiClient.get('/services/filter', { params })
  return res.services || []
}

/** 算法市场专用：只拉 type=generated_algorithm */
export async function filterAlgorithmModels(params: Record<string, string | number | undefined> = {}) {
  const list = await filterServices({ ...params, type: ALGORITHM_MODEL_TYPE })
  return onlyAlgorithmModels(list)
}

export async function searchServices(keyword: string) {
  const res: ListResponse = await apiClient.get('/services/search', { params: { keyword } })
  return res.services || []
}

export async function searchAlgorithmModels(keyword: string) {
  return onlyAlgorithmModels(await searchServices(keyword))
}

export async function smartSearch(params: {
  domain?: string
  name?: string
  description?: string
  role?: string
  function?: string
  requirement?: string
}) {
  const res: ListResponse = await apiClient.get('/services/smart-search', { params })
  return res.services || []
}

export async function smartSearchAlgorithmModels(params: {
  domain?: string
  name?: string
  description?: string
  role?: string
  function?: string
  requirement?: string
}) {
  return onlyAlgorithmModels(await smartSearch(params))
}

export async function getServiceById(id: string) {
  const res: ListResponse = await apiClient.get(`/services/${id}`)
  return res.service as BackendService
}

/** 线上 creatorId 常为空：用商品名前缀匹配用户名（如 WST-xxx / wst_xxx） */
function isNameOwnedByUsername(name: string | undefined, username: string): boolean {
  const n = (name || '').trim().toLowerCase()
  const u = username.trim().toLowerCase()
  if (!n || !u) return false
  return n === u || n.startsWith(`${u}-`) || n.startsWith(`${u}_`) || n.startsWith(u)
}

function isOwnedByUser(svc: BackendService, userId: string, username?: string): boolean {
  const cid = String(svc.creatorId || '').trim()
  if (cid && userId && cid === String(userId)) return true
  if (username && isNameOwnedByUsername(svc.name, username)) return true
  return false
}

/**
 * 当前用户的算法模型列表。
 * 不请求 /services/mine（线上会把 mine 当服务 id 报错）。
 * 直接拉 generated_algorithm，再按 creatorId / 用户名前缀归属。
 */
export async function getMyAlgorithmModels(userId: string, username?: string): Promise<BackendService[]> {
  if (!userId && !username) return []

  let list: BackendService[] = []
  try {
    list = await filterServices({ type: ALGORITHM_MODEL_TYPE })
  } catch {
    try {
      const res: ListResponse = await apiClient.get('/services')
      list = res.services || []
    } catch {
      list = []
    }
  }

  return onlyAlgorithmModels(list).filter((s) => isOwnedByUser(s, userId, username))
}

export async function createService(data: Record<string, unknown>) {
  const res: ListResponse = await apiClient.post('/services', data)
  return res.service as BackendService
}

export async function updateService(id: string, data: Record<string, unknown>) {
  // 既有后端使用 POST 更新，非 PUT
  const res: ListResponse = await apiClient.post(`/services/${id}`, data)
  return res.service as BackendService
}

export async function deployService(id: string) {
  return apiClient.get(`/services/${id}/deploy`)
}

export async function stopService(id: string) {
  return apiClient.get(`/services/${id}/stop`)
}

export async function uploadServicePackage(formData: FormData) {
  return apiClient.post('/services/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
}

/** 尝试调用已部署服务（买家试用） */
export async function trialInvoke(endpoint: string, payload: unknown, method = 'POST') {
  const m = (method || 'POST').toUpperCase()
  if (m === 'GET') {
    const res = await fetch(endpoint, { method: 'GET' })
    const text = await res.text()
    try {
      return { ok: res.ok, status: res.status, data: JSON.parse(text) }
    } catch {
      return { ok: res.ok, status: res.status, data: text }
    }
  }
  const res = await fetch(endpoint, {
    method: m,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  })
  const text = await res.text()
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) }
  } catch {
    return { ok: res.ok, status: res.status, data: text }
  }
}
