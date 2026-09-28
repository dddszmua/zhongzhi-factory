import { agentUrl } from './client'

const STREAM_TIMEOUT_MS = 300000

export type StreamAgentCallbacks = {
  onStart?: () => void
  onStep?: (data: Record<string, unknown>) => void
  onError?: (error: string) => void
  onWarning?: (warning: string) => void
  onFinalResult?: (results: Record<string, unknown>) => void
  onComplete?: () => void
  onAbort?: () => void
  onAbortController?: (controller: AbortController) => void
}

/** 复刻 ioeb streamAgent：POST FormData + SSE */
export async function streamAgent(path: string, formData: FormData, callbacks: StreamAgentCallbacks = {}) {
  const {
    onStart = () => {},
    onStep = () => {},
    onError = () => {},
    onWarning = () => {},
    onFinalResult = () => {},
    onComplete = () => {},
    onAbort = () => {},
    onAbortController = () => {},
  } = callbacks

  const abortController = new AbortController()
  onAbortController(abortController)

  let timedOut = false
  let responseReceived = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    abortController.abort()
  }, STREAM_TIMEOUT_MS)

  try {
    onStart()
    const response = await fetch(agentUrl(path), {
      method: 'POST',
      body: formData,
      signal: abortController.signal,
    })
    responseReceived = true
    clearTimeout(timeoutId)

    if (!response.ok) {
      let msg = `HTTP错误! 状态码: ${response.status}`
      try {
        const errBody = await response.json()
        msg = errBody?.detail?.message || errBody?.detail || errBody?.message || msg
        if (typeof msg !== 'string') msg = JSON.stringify(msg)
      } catch {
        /* ignore */
      }
      onError(msg)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      onError('无法读取智能体响应流')
      return
    }

    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        onComplete()
        break
      }
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() || ''

      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data:')) continue
        const raw = line.replace(/^data:\s*/, '')
        if (!raw || raw === '[DONE]') continue
        try {
          const data = JSON.parse(raw)
          if (data.error) {
            onError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
            return
          }
          if (data.warning) {
            onWarning(typeof data.warning === 'string' ? data.warning : JSON.stringify(data.warning))
            return
          }
          if (data.is_final_result && data.final_results) {
            onFinalResult(data.final_results)
            return
          }
          if (data.step) onStep(data)
        } catch {
          /* skip malformed chunk */
        }
      }
    }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      if (timedOut) onError('连接智能体超时，请稍后重试')
      else onAbort()
      return
    }
    const msg = error instanceof Error ? error.message : String(error)
    onError(responseReceived ? msg : `网络错误：${msg}`)
  }
}

export async function callAgentApi(path: string, formData: FormData) {
  const response = await fetch(agentUrl(path), { method: 'POST', body: formData })
  if (!response.ok) {
    let msg = `请求失败 (${response.status})`
    try {
      const body = await response.json()
      msg = body?.detail?.message || body?.detail || body?.message || msg
      if (typeof msg !== 'string') msg = JSON.stringify(msg)
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return response.json()
}
