import { apiClient } from './client'

export type McpCandidate = {
  entrypoint: string
  name: string
  description: string
  parameters: string[]
}

export type McpTool = {
  entrypoint: string
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export type McpJob = {
  id: string
  sourceServiceId?: string
  sourceName: string
  sourceDigest: string
  spec: { service_name?: string; scenario?: string; target_users?: string[]; source_digest?: string; transport?: string; tools?: McpTool[] }
  candidates: McpCandidate[]
  status: string
  stage: string
  progressText?: string
  revision: number
  artifactReady: boolean
  artifactDigest?: string
  serviceId?: string
  serviceStatus?: string
  verifiedTools?: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>
  verifiedAt?: number
  error?: string
  updatedAt: number
}

const root = '/mcp-packaging/jobs'

export async function listMcpJobs(): Promise<McpJob[]> {
  const result = await apiClient.get(root) as { jobs: McpJob[] }
  return result.jobs
}

export async function createMcpJob(sourceServiceId?: string): Promise<McpJob> {
  const result = await apiClient.post(root, sourceServiceId ? { sourceServiceId } : {}) as { job: McpJob }
  return result.job
}

export async function getMcpJob(id: string): Promise<McpJob> {
  const result = await apiClient.get(`${root}/${id}`) as { job: McpJob }
  return result.job
}

export async function uploadMcpSource(id: string, file: File): Promise<McpJob> {
  const body = new FormData()
  body.append('file', file)
  const result = await apiClient.put(`${root}/${id}/source`, body, { timeout: 120000 }) as { job: McpJob }
  return result.job
}

export async function saveMcpSpec(id: string, revision: number, spec: McpJob['spec']): Promise<McpJob> {
  const result = await apiClient.patch(`${root}/${id}`, { revision, spec }) as { job: McpJob }
  return result.job
}

export async function suggestMcpIntent(id: string, message: string, partialForm: McpJob['spec']): Promise<{
  updates: { service_name?: string; scenario?: string; target_users?: string[] }
  question?: string
}> {
  return apiClient.post(`${root}/${id}/intake`, { message, partialForm }, { timeout: 95000 })
}

export async function packageMcpJob(id: string): Promise<McpJob> {
  const result = await apiClient.post(`${root}/${id}/package`, {}, { timeout: 30000 }) as { job: McpJob }
  return result.job
}

export async function cancelMcpJob(id: string): Promise<McpJob> {
  const result = await apiClient.post(`${root}/${id}/cancel`) as { job: McpJob }
  return result.job
}

export async function downloadMcpArtifact(id: string): Promise<Blob> {
  return apiClient.get(`${root}/${id}/artifact`, { responseType: 'blob' }) as Promise<Blob>
}

export async function deployMcpJob(id: string): Promise<McpJob> {
  const result = await apiClient.post(`${root}/${id}/deploy`, {}, { timeout: 120000 }) as { job: McpJob }
  return result.job
}

export async function checkMcpJob(id: string, toolName?: string, args?: Record<string, unknown>) {
  return apiClient.post(`${root}/${id}/check`, {
    toolName: toolName || null,
    arguments: args || {},
    confirmCall: !!toolName,
  }, { timeout: 65000 }) as Promise<{
    status: string
    tools: NonNullable<McpJob['verifiedTools']>
    call?: unknown
    job: McpJob
  }>
}

export async function submitMcpReview(id: string): Promise<McpJob> {
  const result = await apiClient.post(`${root}/${id}/submit-review`) as { job: McpJob }
  return result.job
}
