import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { getClinicalArtifact, runClinicalAlgorithm, type ClinicalAlgorithmArtifact } from '@/api/services'

import { ClinicalResultSummary } from './ClinicalResultSummary'

type RunResult = Awaited<ReturnType<typeof runClinicalAlgorithm>>
function readable(value: unknown): string {
  if (value === null) return '空值'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

export function ClinicalTrialPanel({ modelId, isAuthenticated, canRun, unavailableReason }: {
  modelId: string; isAuthenticated: boolean; canRun?: boolean; unavailableReason?: string
}) {
  const [artifact, setArtifact] = useState<ClinicalAlgorithmArtifact | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [result, setResult] = useState<RunResult | null>(null)
  const [submitted, setSubmitted] = useState<Record<string, string>>({})
  const [source, setSource] = useState('手动输入')
  const [resultSource, setResultSource] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [reload, setReload] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const requestGeneration = useRef(0)

  useEffect(() => {
    const generation = ++requestGeneration.current
    setArtifact(null)
    setValues({})
    setError('')
    setFieldErrors({})
    setResult(null)
    setBusy(false)
    setSource('手动输入')
    if (!modelId || !isAuthenticated || canRun === false) return
    getClinicalArtifact(modelId).then((item) => {
      if (generation === requestGeneration.current) setArtifact(item)
    }).catch((cause) => {
      if (generation === requestGeneration.current) setError(cause instanceof Error ? cause.message : '无法读取运行规范')
    })
    return () => { requestGeneration.current++ }
  }, [modelId, isAuthenticated, canRun, reload])

  const stale = result !== null && JSON.stringify(values) !== JSON.stringify(submitted)

  function change(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
    setCopyStatus('')
    if (source.includes('示例')) setSource('已修改的合成示例')
  }

  async function run() {
    if (!artifact || artifact.status !== 'ready' || canRun === false || busy) return
    const inputs: Record<string, unknown> = {}
    const errors: Record<string, string> = {}
    for (const field of artifact.spec.inputs || []) {
      const raw = values[field.name]?.trim() || ''
      if (!raw) {
        if (field.required !== false) errors[field.name] = '请填写' + (field.label || field.name)
        continue
      }
      if (field.type === 'number' || field.type === 'integer') {
        const numeric = Number(raw)
        if (!Number.isFinite(numeric) || (field.type === 'integer' && !Number.isInteger(numeric))) {
          errors[field.name] = field.type === 'integer' ? '请输入有效整数' : '请输入有效数值'
        } else if ((field.minimum != null && numeric < field.minimum) || (field.maximum != null && numeric > field.maximum)) {
          errors[field.name] = '数值超出模型允许范围'
        } else inputs[field.name] = numeric
      } else if (field.type === 'boolean') {
        if (raw !== 'true' && raw !== 'false') errors[field.name] = '请选择有效值'
        else inputs[field.name] = raw === 'true'
      } else inputs[field.name] = raw
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    const generation = requestGeneration.current
    setBusy(true)
    setError('')
    setResult(null)
    setCopyStatus('')
    setSubmitted({ ...values })
    setResultSource(source)
    try {
      const response = await runClinicalAlgorithm(
        modelId, inputs, artifact.version,
        Object.fromEntries(artifact.spec.inputs.filter((field) => field.unit).map((field) => [field.name, field.unit!])),
      )
      if (generation !== requestGeneration.current) return
      setResult(response)
      requestAnimationFrame(() => resultRef.current?.focus())
    } catch (cause) {
      if (generation !== requestGeneration.current) return
      const message = cause instanceof Error ? cause.message : '模型运行失败'
      setError(message)
      if (message.includes('版本已更新')) {
        try {
          const updated = await getClinicalArtifact(modelId)
          if (generation === requestGeneration.current) {
            setArtifact(updated)
            setValues({})
            setSource('手动输入')
            setError('模型版本已更新，请按新的字段要求重新填写后运行。')
          }
        } catch { /* Keep the original error and allow an explicit retry. */ }
      }
    } finally {
      if (generation === requestGeneration.current) setBusy(false)
    }
  }

  async function copyResult() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(JSON.stringify({
        modelId, version: result.version, runId: result.runId,
        inputSource: resultSource, inputs: submitted, result: result.result,
      }, null, 2))
      setCopyStatus('已复制本次输入与结果')
    } catch { setCopyStatus('复制未成功，可展开原始结果后手动复制。') }
  }

  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5 lg:p-7" aria-label="模型在线试用">
      <h2 className="font-bold text-lg text-gray-900">在线试用</h2>
      <p className="text-sm text-gray-500 mt-2">请核对适用范围。使用合成或获授权的数据，运行结果用于研发核对。</p>
      {!isAuthenticated && <div className="cw-empty mt-5"><p>登录后可查看该模型的试用权限。</p><Link className="cw-button" to={'/login?redirect=' + encodeURIComponent('/products/' + modelId + '?trial=1')}>登录并继续</Link></div>}
      {isAuthenticated && canRun === false && <p role="status" className="mt-4 text-sm text-amber-700">{unavailableReason || '当前账号暂不能试用该模型'}</p>}
      {isAuthenticated && canRun !== false && !artifact && !error && <p role="status" className="mt-5 text-gray-500">正在读取模型运行规范…</p>}
      {artifact && <>
        <p className="text-xs text-gray-600 mt-3">版本 {artifact.version} · {artifact.status === 'ready' ? '样例运行已通过' : '待配置或验证未通过'}</p>
        {artifact.spec.clinicalScope && <p className="cw-notice mt-3 text-sm text-gray-600">适用范围：{artifact.spec.clinicalScope.replace(/^适用范围[：:]\s*/, '')}</p>}
        {artifact.status !== 'ready' ? <p className="mt-4 text-sm text-amber-700">{artifact.validationError || '模型尚未具备在线运行条件'}</p> : (
          <div className="cw-trial-layout">
            <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); void run() }}>
              <fieldset disabled={busy} className="space-y-4">
                <legend className="font-semibold mb-3">填写必要指标</legend>
                <div className="flex flex-wrap gap-3 text-sm">
                  {artifact.smokeInput && <button type="button" className="text-blue-700" onClick={() => {
                    setValues(Object.fromEntries(Object.entries(artifact.smokeInput || {}).map(([key, value]) => [key, String(value)])))
                    setSource('合成示例')
                    setFieldErrors({})
                  }}>填入合成示例</button>}
                  <button type="button" className="text-gray-600" onClick={() => {
                    setValues({}); setResult(null); setFieldErrors({}); setError(''); setSource('手动输入'); setCopyStatus('')
                  }}>开始新一次试用</button>
                </div>
                <p className="text-xs text-gray-500">当前数据 · {source}</p>
                {artifact.spec.inputs.map((field, index) => {
                  const id = 'clinical-' + modelId + '-' + index
                  const invalid = Boolean(fieldErrors[field.name])
                  return (
                    <div key={field.name}>
                      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label || field.name} {field.unit && <span className="text-gray-500">（{field.unit}）</span>}
                        {field.required !== false && <span className="text-red-600 ml-1" aria-label="必填">*</span>}
                      </label>
                      {field.type === 'boolean' || field.options?.length ? (
                        <select id={id} value={values[field.name] ?? ''} aria-invalid={invalid} aria-describedby={id + '-hint'} onChange={(event) => change(field.name, event.target.value)} className="block w-full border border-gray-300 rounded-lg p-3 bg-white">
                          <option value="">请选择</option>
                          {(field.options?.length ? field.options : ['true', 'false']).map((option) => <option key={option} value={option}>{field.type === 'boolean' ? (option === 'true' ? '是' : option === 'false' ? '否' : option) : option}</option>)}
                        </select>
                      ) : (
                        <input id={id} type={field.type === 'number' || field.type === 'integer' ? 'number' : 'text'} step={field.type === 'integer' ? '1' : 'any'} min={field.minimum ?? undefined} max={field.maximum ?? undefined} value={values[field.name] ?? ''} aria-invalid={invalid} aria-describedby={id + '-hint'} onChange={(event) => change(field.name, event.target.value)} className="block w-full border border-gray-300 rounded-lg p-3" />
                      )}
                      <div id={id + '-hint'} className="text-xs mt-2 leading-relaxed">
                        {invalid && <p className="text-red-600" role="alert">{fieldErrors[field.name]}</p>}<p className="text-gray-500">{field.description}{field.minimum != null && ' · 最小值 ' + field.minimum}{field.maximum != null && ' · 最大值 ' + field.maximum}</p>
                      </div>
                    </div>
                  )
                })}
                <button className="cw-button w-full" disabled={busy}>{busy ? '正在运行，请稍候…' : '计算结果'}</button>
              </fieldset>
            </form>
            <div className="cw-trial-result" ref={resultRef} tabIndex={-1} aria-live="polite">
              <h3 className="font-semibold">本次计算结果</h3>
              {!result && <p className="text-sm text-gray-500 mt-5 leading-7">{busy ? '已提交输入，正在等待模型返回结果。' : '填写指标并点击“计算结果”，在这里查看输出。'}</p>}
              {result && <>
                <p className="text-xs text-gray-500 mt-3">{resultSource} · 版本 {result.version}{result.durationMs !== undefined && ' · ' + result.durationMs + ' ms'}</p>
                {stale && <p role="status" className="mt-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">输入已修改。下方是上一次输入的结果，请重新运行。</p>}
                <ClinicalResultSummary value={result.result} description={artifact.spec.output?.description} />
                <details className="cw-disclosure"><summary>核对本次输入（{Object.keys(submitted).length} 项）</summary><dl className="cw-summary">{artifact.spec.inputs.filter(field => submitted[field.name] !== undefined && submitted[field.name] !== '').map(field => <div key={field.name}><dt>{field.label || field.name}</dt><dd>{field.type === 'boolean' ? submitted[field.name] === 'true' ? '是' : '否' : submitted[field.name]} {field.unit}</dd></div>)}</dl></details>
                <details className="mt-5 text-sm"><summary className="cursor-pointer text-blue-700">查看本次输入与原始结果</summary><pre className="mt-3 text-xs whitespace-pre-wrap break-all">{JSON.stringify({ inputs: submitted, result: result.result, runId: result.runId }, null, 2)}</pre></details>
                <button className="cw-button secondary mt-5" onClick={() => void copyResult()}>复制本次输入与结果</button>
                {copyStatus && <p role="status" className="text-xs mt-2">{copyStatus}</p>}
              </>}
            </div>
          </div>
        )}
      </>}
      {error && <div role="alert" className="mt-4 p-4 bg-red-50 rounded-lg text-sm text-red-700"><p>{error}</p>{!artifact && isAuthenticated && canRun !== false && <button className="underline mt-2" onClick={() => setReload((n) => n + 1)}>重新读取</button>}</div>}
    </section>
  )
}
