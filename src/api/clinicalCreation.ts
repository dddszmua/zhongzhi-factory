import { apiClient } from './client'
import type { AmlGenerateResult } from './scenarioDev'

export type CreationMode = 'conversation' | 'paper'
export type CreationStatus = 'draft' | 'running' | 'completed' | 'failed' | 'interrupted' | 'published' | 'needs_review'

export type CreationJob = {
  id: string
  mode: CreationMode
  status: CreationStatus
  name: string
  description: string
  notes: string
  departmentId: string
  messages: Array<{ role: 'user' | 'assistant'; text: string }>
  intake: { formDraft?: Record<string, unknown>; status?: string; hint?: string; catalog?: { departmentId?: string; paperId?: string; paperVersion?: string; sourceType?: string } }
  referenceName: string
  referencePreview: string
  referenceReviewed: boolean
  progressStep: number
  progressText: string
  result: AmlGenerateResult | null
  error: string | null
  serviceId: string | null
  createdAt: number
  updatedAt: number
}

export async function listCreationJobs(): Promise<CreationJob[]> {
  const data = await apiClient.get('/clinical-creation/jobs') as { jobs: CreationJob[] }
  return data.jobs
}

export async function createCreationJob(mode: CreationMode, description = '', options: { departmentId?: string; paperId?: string; paperVersion?: string; suggestedPaperId?: string } = {}): Promise<CreationJob> {
  const data = await apiClient.post('/clinical-creation/jobs', { mode, description, ...options }) as { job: CreationJob }
  return data.job
}

export async function getCreationJob(id: string): Promise<CreationJob> {
  const data = await apiClient.get(`/clinical-creation/jobs/${id}`) as { job: CreationJob }
  return data.job
}

export async function updateCreationJob(id: string, patch: Partial<Pick<CreationJob, 'name' | 'description' | 'notes' | 'referenceReviewed' | 'departmentId'>>): Promise<CreationJob> {
  const data = await apiClient.patch(`/clinical-creation/jobs/${id}`, patch) as { job: CreationJob }
  return data.job
}

export async function uploadCreationReference(id: string, file: File): Promise<CreationJob> {
  const form = new FormData()
  form.append('file', file)
  const data = await apiClient.post(`/clinical-creation/jobs/${id}/reference`, form, { timeout: 120000 }) as { job: CreationJob }
  return data.job
}

export async function openCreationReference(id: string, filename: string): Promise<void> {
  const blob = await apiClient.get(`/clinical-creation/jobs/${id}/reference`, { responseType: 'blob' }) as Blob
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function sendCreationMessage(id: string, message: string): Promise<CreationJob> {
  const data = await apiClient.post(`/clinical-creation/jobs/${id}/intake`, { message }, { timeout: 150000 }) as { job: CreationJob }
  return data.job
}

export async function startCreationGeneration(id: string): Promise<CreationJob> {
  const data = await apiClient.post(`/clinical-creation/jobs/${id}/generate`, {}) as { job: CreationJob }
  return data.job
}

export async function publishCreationJob(id: string): Promise<CreationJob> {
  const data = await apiClient.post(`/clinical-creation/jobs/${id}/publish`, {}, { timeout: 120000 }) as { job: CreationJob }
  return data.job
}
