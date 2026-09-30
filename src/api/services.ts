import { apiClient } from './client'
import { onlyAlgorithmModels, type BackendService } from '@/lib/mappers'
import { onlyClinicalListed } from '@/lib/clinical'

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
  const res: ListResponse = await apiClient.get('/services/clinical-catalog', { params: { q: params.q } })
  const list = res.services || []
  return onlyClinicalListed(onlyAlgorithmModels(list))
}

export async function searchServices(keyword: string) {
  const res: ListResponse = await apiClient.get('/services/search', { params: { keyword } })
  return res.services || []
}

export async function searchAlgorithmModels(keyword: string) {
  return filterAlgorithmModels({ q: keyword })
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
  return filterAlgorithmModels({ q: params.requirement || params.description || params.name || '' })
}

export async function getPublicClinicalServiceById(id: string) {
  const res: ListResponse = await apiClient.get(`/services/clinical-catalog/${id}`)
  return res.service as BackendService
}

export interface ClinicalAlgorithmArtifact {
  serviceId: string
  version: number
  status: 'ready' | 'draft' | 'needs_configuration' | string
  validationError?: string
  publicTrialEnabled?: boolean
  smokeInput?: Record<string, unknown>
  source?: { reproductionMode?: boolean; referenceCheck?: ClinicalReferenceCheckResult }
  spec: {
    title?: string
    description?: string
    clinicalScope?: string
    inputs: Array<{ name: string; label?: string; type: 'number' | 'integer' | 'string' | 'boolean'; unit?: string; minimum?: number; maximum?: number; description?: string; required?: boolean; options?: string[] }>
    output?: { description?: string }
  }
}

export interface ClinicalReferenceCheckResult {
  passed: boolean
  citation: string
  expected: unknown
  actual: unknown
  artifactVersion: number
  checkedAt: string
}

export async function checkClinicalReference(id: string, payload: { citation: string; inputs: Record<string, unknown>; expected: unknown; absoluteTolerance: number; relativeTolerance: number; units: Record<string, string> }): Promise<ClinicalReferenceCheckResult> {
  const result = await apiClient.post(`/services/${id}/clinical-reference-check`, payload) as { referenceCheck: ClinicalReferenceCheckResult }
  return result.referenceCheck
}

export async function getClinicalArtifact(id: string): Promise<ClinicalAlgorithmArtifact> {
  const result = await apiClient.get(`/services/${id}/algorithm-artifact`) as { artifact: ClinicalAlgorithmArtifact }
  return result.artifact
}

export async function runClinicalAlgorithm(id: string, inputs: Record<string, unknown>, version: number, units: Record<string, string>): Promise<{ result: unknown; version: number }> {
  return apiClient.post(`/services/${id}/algorithm-run`, { inputs, version, units })
}

export async function setClinicalTrialEnabled(id: string, enabled: boolean): Promise<void> {
  await apiClient.post(`/services/${id}/clinical-trial-policy`, { enabled })
}

export async function configureClinicalArtifact(id: string, spec: ClinicalAlgorithmArtifact['spec'], smokeInput: Record<string, unknown>): Promise<ClinicalAlgorithmArtifact> {
  const result = await apiClient.post(`/services/${id}/clinical-artifact/configure`, { spec, smokeInput }) as { artifact: ClinicalAlgorithmArtifact }
  return result.artifact
}

export type ClinicalReviewItem = BackendService & { referenceAssets?: Array<{ name: string; size: number; sha256: string }>; referenceCheck?: ClinicalReferenceCheckResult; reproductionMode?: boolean }

export async function getClinicalReviewQueue(): Promise<ClinicalReviewItem[]> {
  const result: ListResponse = await apiClient.get('/services/clinical-review-queue')
  return (result.services || []) as ClinicalReviewItem[]
}

export async function reviewClinicalService(id: string, decision: 'approved' | 'rejected'): Promise<void> {
  await apiClient.post(`/services/${id}/clinical-review`, { decision })
}

export async function downloadClinicalReference(id: string, index: number): Promise<Blob> {
  return apiClient.get(`/services/${id}/clinical-reference/${index}`, { responseType: 'blob' }) as Promise<Blob>
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
