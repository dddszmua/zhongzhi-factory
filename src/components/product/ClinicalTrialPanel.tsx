import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getClinicalArtifact, runClinicalAlgorithm, type ClinicalAlgorithmArtifact } from '@/api/services'

export function ClinicalTrialPanel({ modelId, isAuthenticated, canRun, unavailableReason }: { modelId: string; isAuthenticated: boolean; canRun?: boolean; unavailableReason?: string }) {
  const [artifact, setArtifact] = useState<ClinicalAlgorithmArtifact | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ result: unknown; version: number; runId?: string; durationMs?: number } | null>(null)
  const [hasResult, setHasResult] = useState(false)

  useEffect(() => {
    setArtifact(null)
    setError('')
    setResult(null)
    setHasResult(false)
    if (!modelId || !isAuthenticated || canRun === false) return
    let active = true
    getClinicalArtifact(modelId).then((item) => {
      if (!active) return
      setArtifact(item)
      setValues(Object.fromEntries(Object.entries(item.smokeInput || {}).map(([key, value]) => [key, String(value)])))
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : '无法读取运行规范') })
    return () => { active = false }
  }, [modelId, isAuthenticated, canRun])

  async function run() {
    if (!artifact || artifact.status !== 'ready' || canRun === false || busy) return
    const inputs: Record<string, unknown> = {}
    for (const field of artifact.spec.inputs || []) {
      const raw = values[field.name]?.trim() || ''
      if (!raw) {
        if (field.required !== false) { setError(`请填写${field.label || field.name}`); return }
        continue
      }
      if (field.type === 'number' || field.type === 'integer') {
        const numeric = Number(raw)
        if (!Number.isFinite(numeric) || (field.type === 'integer' && !Number.isInteger(numeric))) { setError(`${field.label || field.name}需要有效数值`); return }
        if ((field.minimum != null && numeric < field.minimum) || (field.maximum != null && numeric > field.maximum)) { setError(`${field.label || field.name}超出允许范围`); return }
        inputs[field.name] = numeric
      } else if (field.type === 'boolean') {
        if (raw !== 'true' && raw !== 'false') { setError(`${field.label || field.name}请选择有效值`); return }
        inputs[field.name] = raw === 'true'
      } else inputs[field.name] = raw
    }
    setBusy(true)
    setError('')
    setResult(null)
    setHasResult(false)
    try { setResult(await runClinicalAlgorithm(modelId, inputs, artifact.version, Object.fromEntries(artifact.spec.inputs.filter((field) => field.unit).map((field) => [field.name, field.unit!]))) ); setHasResult(true) }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : '模型运行失败'
      setError(message)
      if (message.includes('版本已更新')) {
        try { setArtifact(await getClinicalArtifact(modelId)) } catch { /* Keep the original run error. */ }
      }
    }
    finally { setBusy(false) }
  }

  return <section className="bg-white rounded-2xl border border-black/5 p-5" aria-label="模型在线试用">
    <h2 className="font-bold text-gray-900">在线试用</h2>
    <p className="text-xs text-gray-500 mt-1 mb-4">使用合成或获授权的数据。运行结果用于研发核对，不能单独作为诊疗决定。</p>
    {!isAuthenticated && <p className="text-sm text-gray-600">请<Link className="text-blue-600 mx-1" to={`/login?redirect=${encodeURIComponent(`/products/${modelId}?trial=1`)}`}>登录</Link>后查看试用权限。</p>}
    {isAuthenticated && canRun === false && <p className="text-sm text-amber-700">{unavailableReason || '当前账号暂不能试用该模型'}</p>}
    {isAuthenticated && canRun !== false && !artifact && !error && <p className="text-sm text-gray-500">正在读取模型运行规范…</p>}
    {artifact && <>
      <p className="text-xs text-gray-600 mb-3">版本 {artifact.version} · {artifact.status === 'ready' ? '样例运行已通过' : '待配置或验证未通过'}</p>
      {artifact.status !== 'ready' && <p className="text-sm text-amber-700 mb-3">{artifact.validationError || '模型尚未具备在线运行条件'}</p>}
      {artifact.status === 'ready' && <div className="space-y-3">
        <div className="flex gap-3"><button type="button" className="text-sm text-blue-600" onClick={() => setValues(Object.fromEntries(Object.entries(artifact.smokeInput || {}).map(([key, value]) => [key, String(value)])))}>填入合成样例</button><button type="button" className="text-sm text-gray-600" onClick={() => setValues({})}>清空</button></div>
        {(artifact.spec.inputs || []).map((field) => <label key={field.name} className="block text-sm text-gray-700">
          <span className="font-medium">{field.label || field.name}</span>{field.unit && <span className="text-gray-400 ml-1">({field.unit})</span>}{field.required !== false && <span className="text-red-500"> *</span>}
          {field.type === 'boolean' || field.options?.length ? <select value={values[field.name] ?? ''} onChange={(e) => setValues({ ...values, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-200 rounded-xl p-2"><option value="">请选择</option>{(field.options?.length ? field.options : ['true', 'false']).map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input type={field.type === 'number' || field.type === 'integer' ? 'number' : 'text'} step={field.type === 'integer' ? '1' : 'any'} min={field.minimum ?? undefined} max={field.maximum ?? undefined} value={values[field.name] ?? ''} onChange={(e) => setValues({ ...values, [field.name]: e.target.value })} className="mt-1 block w-full border border-gray-200 rounded-xl p-2" />}
          {field.description && <span className="block text-xs text-gray-500 mt-1">{field.description}</span>}
        </label>)}
        <button disabled={busy || canRun === false} onClick={() => void run()} className="w-full bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-50">{busy ? '运行中…' : '运行模型'}</button>
        {artifact.spec.output?.description && <p className="text-xs text-gray-500">结果含义：{artifact.spec.output.description}</p>}
      </div>}
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {hasResult && <div className="mt-3"><p className="text-xs text-gray-500">版本 {result?.version}{result?.durationMs !== undefined ? ` · 耗时 ${result.durationMs} ms` : ''}{result?.runId ? ` · 运行编号 ${result.runId}` : ''}</p><pre className="mt-2 bg-gray-50 p-3 rounded-xl text-xs overflow-auto max-h-72 whitespace-pre-wrap">{JSON.stringify(result?.result, null, 2)}</pre></div>}
  </section>
}
