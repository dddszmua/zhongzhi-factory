import { agentUrl } from './client'
import { getToken } from '@/lib/storage'

/**
 * 帮我找算法：优先走后端 smart-search；
 * 同时尝试 Agent 推荐（SSE），失败时静默忽略。
 */
export async function recommendViaAgent(message: string, serviceType = 'atomic_mcp') {
  const form = new FormData()
  form.append('message', message)
  form.append('service_type', serviceType)
  form.append('scenario_summary', message)
  form.append('user_remark', message)

  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers['Access-Token'] = token

  const res = await fetch(agentUrl('/api/agent/mcp_service_recommendation'), {
    method: 'POST',
    body: form,
    headers,
  })

  if (!res.ok) {
    throw new Error(`Agent 推荐失败 (${res.status})`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }

  // SSE / text stream：聚合文本
  const reader = res.body?.getReader()
  if (!reader) return { text: await res.text() }

  const decoder = new TextDecoder()
  let text = ''
  let finalPayload: unknown = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    text += chunk
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data:')) continue
      const raw = line.slice(5).trim()
      if (!raw || raw === '[DONE]') continue
      try {
        const obj = JSON.parse(raw)
        if (obj?.type === 'final_result' || obj?.final_result || obj?.result) {
          finalPayload = obj.final_result || obj.result || obj
        }
      } catch {
        // keep streaming text
      }
    }
  }

  return finalPayload || { text }
}
