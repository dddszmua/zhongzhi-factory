import { apiClient } from './client'
import { callAgentApi, streamAgent, type StreamAgentCallbacks } from './agentStream'

export type ScenarioFormDraft = {
  model_name?: string
  free_narrative?: string
  industry?: string
  scenario?: string
  technology?: string
  algorithm_category?: string
  category_params?: Record<string, unknown>
}

export type ScenarioIntakeResult = {
  success?: boolean
  status?: 'updated' | 'question' | string
  text?: string
  hint?: string
  session_id?: string
  formDraft?: ScenarioFormDraft
  changedFields?: string[]
}

export type AmlGenerateResult = {
  model_name?: string
  generated_code?: string
  code_filename?: string
  model_summary?: {
    purpose?: string
    input_description?: string
    output_description?: string
    usage_scenarios?: string[]
    limitations?: string
    next_steps?: string[]
  }
  test_results?: Array<{ name?: string; status?: string; description?: string; details?: string }>
  references?: Array<Record<string, string>>
  differentiation_summary?: {
    overall_strategy?: string
    key_innovations?: string[]
    improvements?: string[]
    advantages?: string[]
    ip_risk_notes?: string
  }
}

/** 自然语言对话填表 */
export async function callScenarioIntake(formData: FormData): Promise<ScenarioIntakeResult> {
  return callAgentApi('/api/agent/aml_scenario_intake', formData)
}

/** SSE 生成算法源码 */
export function streamAutoGenerate(formData: FormData, callbacks: StreamAgentCallbacks) {
  return streamAgent('/api/agent/aml_auto_generate', formData, callbacks)
}

/** 登记为 type=generated_algorithm */
export async function uploadScenarioGenerated(formData: FormData) {
  return apiClient.post('/services/scenario-generated/upload', formData, {
    timeout: 120000,
  }) as Promise<{ status?: string; message?: string; service?: { id?: string; name?: string } }>
}
