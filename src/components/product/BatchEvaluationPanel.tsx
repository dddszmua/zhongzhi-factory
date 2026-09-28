import { useState } from 'react'
import { toast } from 'sonner'
import { trialInvoke } from '@/api/services'
import { Btn } from '@/components/ui/Btn'

type Case = { input: unknown; expected: unknown }
type Result = { index: number; passed: boolean; actual: unknown; error?: string }

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function BatchEvaluationPanel({ endpoint, method }: { endpoint: string; method: string }) {
  const [casesText, setCasesText] = useState('[\n  { "input": { "sample": "示例" }, "expected": { "result": "预期值" } }\n]')
  const [results, setResults] = useState<Result[]>([])
  const [running, setRunning] = useState(false)

  async function run() {
    if (!endpoint) return toast.error('供应商尚未配置试用端点')
    let cases: Case[]
    try {
      const parsed: unknown = JSON.parse(casesText)
      if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 20 || parsed.some((item) => !item || typeof item !== 'object' || !('input' in item) || !('expected' in item))) {
        throw new Error('请提供 1 到 20 条含 input 和 expected 的 JSON 测试用例')
      }
      cases = parsed as Case[]
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'JSON 格式错误')
      return
    }
    setRunning(true)
    setResults([])
    const next: Result[] = []
    for (const [index, item] of cases.entries()) {
      try {
        const response = await trialInvoke(endpoint, item.input, method)
        next.push({ index, passed: response.ok && canonical(response.data) === canonical(item.expected), actual: response.data, error: response.ok ? undefined : `HTTP ${response.status}` })
      } catch (error) {
        next.push({ index, passed: false, actual: null, error: error instanceof Error ? error.message : '调用失败' })
      }
      setResults([...next])
    }
    setRunning(false)
  }

  async function importFile(file?: File) {
    if (!file) return
    if (file.size > 1024 * 1024) return toast.error('JSON 文件请控制在 1 MB 以内')
    setCasesText(await file.text())
    setResults([])
  }

  return <div className="bg-white rounded-2xl border border-black/5 p-6 mt-6">
    <h2 className="font-bold text-gray-900">批量数据测评</h2>
    <p className="text-xs text-gray-500 mt-1 mb-3">提供 1 到 20 条 JSON 用例，每条包含 input 和 expected。结果按 JSON 内容比较；测评在当前浏览器中运行。</p>
    <textarea value={casesText} onChange={(event) => setCasesText(event.target.value)} rows={7} spellCheck={false} className="w-full border border-gray-200 rounded-xl p-3 font-mono text-xs resize-y" aria-label="JSON 测试用例" />
    <div className="flex flex-wrap items-center gap-3 mt-3">
      <Btn disabled={running || !endpoint} onClick={() => void run()}>{running ? '测评中…' : '运行测评'}</Btn>
      <label className="text-sm text-blue-600 cursor-pointer">导入 JSON 文件<input type="file" accept=".json,application/json" className="sr-only" onChange={(event) => void importFile(event.target.files?.[0])} /></label>
    </div>
    {results.length > 0 && <div className="mt-5 text-sm">
      <p className="font-semibold text-gray-800">已完成 {results.length} 条，通过 {results.filter((item) => item.passed).length} 条</p>
      <div className="space-y-2 mt-3">{results.map((item) => <details key={item.index} className="border border-gray-100 rounded-lg p-3"><summary className={item.passed ? 'text-green-700' : 'text-red-600'}>用例 {item.index + 1}：{item.passed ? '通过' : '未通过'}{item.error ? `（${item.error}）` : ''}</summary><pre className="text-xs text-gray-600 whitespace-pre-wrap break-all mt-2">实际输出：{JSON.stringify(item.actual, null, 2)}</pre></details>)}</div>
    </div>}
  </div>
}
