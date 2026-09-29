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
  return onlyAlgorithmModels(list).filter((service) => service.status !== 'draft')
}

export async function searchServices(keyword: string) {
  const res: ListResponse = await apiClient.get('/services/search', { params: { keyword } })
  return res.services || []
}

export async function searchAlgorithmModels(keyword: string) {
  return onlyAlgorithmModels(await searchServices(keyword)).filter((service) => service.status !== 'draft')
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
  return onlyAlgorithmModels(await smartSearch(params)).filter((service) => service.status !== 'draft')
}

export async function getServiceById(id: string) {
  const res: ListResponse = await apiClient.get(`/services/${id}`)
  return res.service as BackendService
}

/** 只使用后端按登录身份返回的列表，不通过商品名推测所有权。 */
export async function getMyAlgorithmModels(userId: string, _username?: string): Promise<BackendService[]> {
  if (!userId) return []
  const res: ListResponse = await apiClient.get('/services/mine')
  return onlyAlgorithmModels(res.services || [])
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

/** 源码仅允许成果创建者读取；通过 axios 自动携带登录令牌。 */
export async function getGeneratedCode(id: string): Promise<Blob> {
  return apiClient.get(`/services/${id}/scenario-generated-code`, { responseType: 'blob' }) as Promise<Blob>
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
