import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import { useAuth } from '@/auth/AuthContext'
import { ClinicalTrialPanel } from '@/components/product/ClinicalTrialPanel'
import { ClinicalSpecEditor } from '@/components/product/ClinicalSpecEditor'
import { checkClinicalReference, configureClinicalArtifact, getClinicalArtifact, getClinicalParameters, getClinicalRuns, getMyAlgorithmModels, setClinicalTrialEnabled, type ClinicalAlgorithmArtifact, type ClinicalParameter, type ClinicalRun } from '@/api/services'
import { isClinicalListed, readClinicalCard } from '@/lib/clinical'
import type { BackendService } from '@/lib/mappers'

export function SupplierTrialPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('id') || ''
  const [models, setModels] = useState<BackendService[]>([])
  const selectedModel = models.find(model => model.id === selectedId)
  const isOwner = Boolean(selectedModel && (!selectedModel.creatorId || selectedModel.creatorId === user?.id))
  const [artifact, setArtifact] = useState<ClinicalAlgorithmArtifact | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [spec, setSpec] = useState<ClinicalAlgorithmArtifact['spec']>({ inputs: [] })
  const [samples, setSamples] = useState<Record<string, string>>({})
  const [parameters, setParameters] = useState<ClinicalParameter[]>([])
  const [runs, setRuns] = useState<ClinicalRun[]>([])
  const [advanced, setAdvanced] = useState(false)
  const [specText, setSpecText] = useState('')
  const [referenceInputs, setReferenceInputs] = useState('{}')
  const [referenceDraft, setReferenceDraft] = useState<Record<string, string>>({})
  const [referenceExpected, setReferenceExpected] = useState('')
  const [referenceCitation, setReferenceCitation] = useState('')
  const [revision, setRevision] = useState(0)
  const [tab, setTab] = useState<'trial' | 'evidence' | 'settings'>('trial')
  const [dirty, setDirty] = useState(false)
  const [referenceAdvanced, setReferenceAdvanced] = useState(false)
  const [referenceDirty, setReferenceDirty] = useState(false)
  useUnsavedChanges(dirty || referenceDirty)
  function selectModel(id: string) {
    if ((dirty || referenceDirty) && !window.confirm('试用设置尚未保存，是否放弃修改并切换模型？')) return
    setDirty(false); setReferenceDirty(false); setTab('trial'); setParams({ id })
  }
  function changeAdvanced(checked: boolean) {
    if (checked) setSpecText(JSON.stringify(spec, null, 2))
    else { try { const parsed = JSON.parse(specText); if (!parsed || !Array.isArray(parsed.inputs)) throw new Error(); setSpec(parsed) } catch { toast.error('请先修正 JSON 格式，或重新加载页面放弃修改'); return } }
    setAdvanced(checked)
  }
  function referenceFormInputs(requireAll = true): Record<string, unknown> {
    const inputs: Record<string, unknown> = {}
    for (const field of artifact?.spec.inputs || []) {
      const raw = referenceDraft[field.name]?.trim() || ''
      if (!raw) { if (requireAll && field.required !== false) throw new Error('请填写' + (field.label || field.name)); continue }
      if (field.type === 'number' || field.type === 'integer') {
        const value = Number(raw)
        if (!Number.isFinite(value) || (field.type === 'integer' && !Number.isInteger(value))) throw new Error((field.label || field.name) + '需要有效数值')
        inputs[field.name] = value
      } else inputs[field.name] = field.type === 'boolean' ? raw === 'true' : raw
    }
    return inputs
  }
  function toggleReferenceEditor(checked: boolean) {
    try {
      if (checked) setReferenceInputs(JSON.stringify(referenceFormInputs(false), null, 2))
      else {
        const values = JSON.parse(referenceInputs)
        if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('请输入指标名称与数值组成的对象')
        setReferenceDraft(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)])))
      }
      setReferenceAdvanced(checked)
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '请检查输入格式') }
  }

  useEffect(() => {
    if (!user?.id) return
    let active = true
    getMyAlgorithmModels(user.id).then((items) => {
      if (!active) return
      const clinical = items.filter((item) => item.domain === 'health')
      setModels(clinical)
      if (!selectedId && clinical[0]?.id) setParams({ id: clinical[0].id }, { replace: true })
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : '加载模型失败') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id, selectedId, setParams])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    setArtifact(null)
    setError('')
    getClinicalArtifact(selectedId).then((item) => {
      if (!active) return
      setArtifact(item)
      setDirty(false)
      setReferenceDirty(false)
      setAdvanced(false)
      setTab(current => item.status === 'ready' ? current : 'settings')
      setSpec(item.spec)
      setSpecText(JSON.stringify(item.spec, null, 2))
      setSamples(Object.fromEntries(Object.entries(item.smokeInput || {}).map(([name, value]) => [name, String(value)])))
      setReferenceInputs(JSON.stringify(item.smokeInput || {}, null, 2))
      setReferenceDraft(Object.fromEntries(Object.entries(item.smokeInput || {}).map(([key, value]) => [key, String(value)])))
      setReferenceAdvanced(false)
      setReferenceCitation(item.source?.referenceCheck?.citation || '')
      setReferenceExpected(item.source?.referenceCheck ? JSON.stringify(item.source.referenceCheck.expected, null, 2) : '')
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : '读取模型规范失败') })
    return () => { active = false }
  }, [selectedId, revision])

  useEffect(() => {
    if (!selectedId || tab !== 'settings' || !isOwner) return
    let active = true
    setParameters([])
    getClinicalParameters(selectedId).then((items) => { if (active) setParameters(items) })
      .catch((cause) => { if (active) toast.error(cause instanceof Error ? cause.message : '无法读取源码参数') })
    return () => { active = false }
  }, [selectedId, tab, isOwner])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    getClinicalRuns(selectedId).then((items) => { if (active) setRuns(items) }).catch(() => { if (active) setRuns([]) })
    return () => { active = false }
  }, [selectedId, revision])

  async function configure() {
    if (!selectedId || !artifact) return
    setBusy(true)
    try {
      if (referenceDirty && !window.confirm('保存设置会更新模型版本，并重置尚未提交的原文对照内容。是否继续？')) return
      const nextSpec = advanced ? JSON.parse(specText) as ClinicalAlgorithmArtifact['spec'] : spec
      if (!nextSpec || !Array.isArray(nextSpec.inputs) || !nextSpec.inputs.length) throw new Error('请先配置输入字段')
      const smokeInput: Record<string, unknown> = {}
      for (const field of nextSpec.inputs) {
        const raw = samples[field.name]?.trim() || ''
        if (!raw) { if (field.required !== false) throw new Error(`请填写${field.label || field.name}的合成样例`); continue }
        if (field.type === 'number' || field.type === 'integer') {
          const value = Number(raw)
          if (!Number.isFinite(value) || (field.type === 'integer' && !Number.isInteger(value))) throw new Error(`${field.label || field.name}需要有效数值`)
          smokeInput[field.name] = value
        } else if (field.type === 'boolean') {
          if (raw !== 'true' && raw !== 'false') throw new Error(`${field.label || field.name}请填写 true 或 false`)
          smokeInput[field.name] = raw === 'true'
        } else smokeInput[field.name] = raw
      }
      const updated = await configureClinicalArtifact(selectedId, nextSpec, smokeInput, artifact!.version)
      setDirty(false)
      setArtifact(updated)
      setRevision((value) => value + 1)
      toast.message(updated.status === 'ready' ? '样例运行已通过' : `验证未通过：${updated.validationError || '请检查运行环境'}`)
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '保存失败') }
    finally { setBusy(false) }
  }

  async function toggleTrial() {
    if (!selectedId || !artifact) return
    setBusy(true)
    try {
      await setClinicalTrialEnabled(selectedId, !artifact.publicTrialEnabled)
      setArtifact({ ...artifact, publicTrialEnabled: !artifact.publicTrialEnabled })
      toast.success(artifact.publicTrialEnabled ? '已关闭公开试用' : '已允许审核通过后公开试用')
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '保存失败') }
    finally { setBusy(false) }
  }

  async function checkReference() {
    if (!selectedId || !artifact) return
    setBusy(true)
    try {
      const inputs = referenceAdvanced ? JSON.parse(referenceInputs) as Record<string, unknown> : referenceFormInputs()
      if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) throw new Error('示例输入须包含指标名称及对应数值')
      for (const field of artifact.spec.inputs) {
        const value = inputs[field.name]
        if (value === undefined || value === null || value === '') { if (field.required !== false) throw new Error('请填写' + (field.label || field.name)); continue }
        if ((field.type === 'number' || field.type === 'integer') && (typeof value !== 'number' || !Number.isFinite(value) || (field.type === 'integer' && !Number.isInteger(value)))) throw new Error((field.label || field.name) + '需要有效数值')
      }
      const expected = JSON.parse(referenceExpected) as unknown
      const units = Object.fromEntries(artifact.spec.inputs.filter((field) => field.unit).map((field) => [field.name, field.unit!]))
      const report = await checkClinicalReference(selectedId, { citation: referenceCitation.trim(), inputs, expected, absoluteTolerance: 1e-6, relativeTolerance: 1e-6, units })
      setArtifact({ ...artifact, source: { ...artifact.source, referenceCheck: report } })
      setReferenceDirty(false)
      toast[report.passed ? 'success' : 'error'](report.passed ? '原文对照通过' : '实际输出与原文预期不一致')
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '原文对照失败') }
    finally { setBusy(false) }
  }

  return <div className="cw-clinical max-w-5xl p-6 lg:p-8 space-y-6">
    <button onClick={() => { if ((!dirty && !referenceDirty) || window.confirm('设置尚未保存，是否离开？')) navigate('/supplier/products') }} className="text-sm text-blue-600">← 我的模型</button>
    <div><h1 className="text-2xl font-bold">模型试用</h1><p className="text-sm text-gray-500 mt-1">先核对适用条件，再填写指标查看结果。</p></div>
    <section className="bg-white border rounded-2xl p-5">
      <label className="text-sm font-semibold">选择模型<select value={selectedId} disabled={busy} onChange={(event) => selectModel(event.target.value)} className="block w-full border rounded-xl p-2 mt-2"><option value="">请选择</option>{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
      {!loading && models.length === 0 && <p className="text-sm text-gray-500 mt-3">还没有可配置的临床模型。<button onClick={() => navigate('/supplier/create')} className="text-blue-600 ml-1">创建模型</button></p>}
      {error && <div role="alert" className="text-red-600 text-sm mt-3"><p>{error}</p>{selectedId && <button className="underline mt-2" onClick={() => setRevision(value => value + 1)}>重新读取模型</button>}</div>}
    </section>
    {selectedId && !artifact && !error && <p role="status">正在读取模型…</p>}
    {artifact && <>
      <div className="cw-model-heading"><h2>{models.find(model => model.id === selectedId)?.name || artifact.spec.title || '当前模型'}</h2><span>版本 {artifact.version} · {artifact.status === 'ready' ? '可试用 · 样例运行通过' : '需要完善试用设置'}</span></div>
      <nav className="cw-tab-nav" aria-label="模型工作区">{([['trial', '在线试用'], ['evidence', '说明与依据'], ['settings', '试用设置 · 作者']] as const).filter(([value]) => value !== 'settings' || isOwner).map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</nav>
      <div hidden={tab !== 'trial'}><ClinicalTrialPanel key={selectedId + '-' + revision} modelId={selectedId} isAuthenticated />{artifact.status !== 'ready' && isOwner && <button className="cw-button mt-4" onClick={() => setTab('settings')}>完善试用设置</button>}</div>
      <section hidden={tab !== 'evidence'} className="cw-panel cw-form-stack"><h2>模型说明与依据</h2><dl className="cw-summary"><div><dt>用途</dt><dd>{artifact.spec.description || '尚未提供用途说明'}</dd></div><div><dt>适用条件</dt><dd>{artifact.spec.clinicalScope || '尚未提供，请向作者核对适用条件'}</dd></div><div><dt>输出含义</dt><dd>{artifact.spec.output?.description || '尚未提供输出说明'}</dd></div><div><dt>原文对照</dt><dd>{artifact.source?.referenceCheck ? artifact.source.referenceCheck.citation : '暂无原文对照记录'}</dd></div></dl><p className="text-sm text-gray-500">样例运行通过仅表示该样例可以运行，不代表临床有效性已得到验证。</p></section>
      <div hidden={tab !== 'settings' || !isOwner} className="space-y-5">
      <section className="bg-white border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">运行状态：{artifact.status === 'ready' ? '样例验证通过' : '待配置或验证失败'}</h2>
        <p className="text-sm text-gray-500">版本 {artifact.version}。{artifact.validationError || '输入规范与源码已绑定到同一版本。'}</p>
        <details className="cw-disclosure"><summary>共享设置</summary><dl className="cw-summary"><div><dt>目录审核</dt><dd>{selectedModel && isClinicalListed(selectedModel) ? '已通过' : selectedModel && readClinicalCard(selectedModel)?.reviewStatus === 'rejected' ? '未通过' : '尚未通过'}</dd></div><div><dt>试用许可</dt><dd>{artifact.publicTrialEnabled ? '已开启，实际访问仍受审核与权限限制' : '未开启'}</dd></div></dl><p className="text-sm text-gray-500 my-3">此处仅设置试用许可；进入公开目录还需单独通过审核。</p><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(artifact.publicTrialEnabled)} onChange={() => void toggleTrial()} disabled={busy || artifact.status !== 'ready'} /> 目录审核通过后允许其他已授权用户试用</label></details>
      </section>
      <details open={artifact.status !== 'ready'} className="cw-disclosure cw-panel"><summary>指标与合成样例设置</summary><fieldset disabled={busy} className="space-y-3 mt-4">
        <div className="flex justify-between items-center"><h2 className="font-semibold">完善填写要求</h2><label className="text-sm"><input type="checkbox" checked={advanced} onChange={(event) => changeAdvanced(event.target.checked)} /> JSON 高级编辑</label></div>
        <p className="text-xs text-gray-500">请使用合成数据填写样例。保存后平台会实际运行；修改配置将产生新版本，并关闭公开试用。</p>
        {advanced ? <label className="block text-sm">输入输出规范 JSON<textarea value={specText} onChange={(event) => { setSpecText(event.target.value); setDirty(true) }} rows={12} className="block w-full border rounded-xl p-3 mt-1 font-mono text-xs" /></label> : <ClinicalSpecEditor spec={spec} parameters={parameters} samples={samples} onSpecChange={value => { setSpec(value); setDirty(true) }} onSamplesChange={value => { setSamples(value); setDirty(true) }} />}
        <button disabled={busy} onClick={() => void configure()} className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm disabled:opacity-50">{busy ? '验证中…' : '保存并运行样例验证'}</button>
        <p role="status" className="text-xs text-gray-500">{dirty ? '有未保存的修改' : '当前设置已保存'}</p></fieldset></details>
      {artifact.source?.reproductionMode && <details className="cw-disclosure cw-panel"><summary>原文结果对照 · 公开审核前完成</summary><fieldset disabled={busy} className="space-y-3 mt-4">
        <p className="text-xs text-gray-500">填写论文或专利中的独立计算示例。平台会运行当前版本并按绝对或相对误差 1e-6 对照；公开审核要求对照通过。</p>
        <label className="block text-sm">原文页码、公式号或实施例<input value={referenceCitation} onChange={(event) => { setReferenceCitation(event.target.value); setReferenceDirty(true) }} className="block w-full border rounded-xl p-3 mt-1" placeholder="例如：第 4 页公式 (3)，实施例 1" /></label>
        <label className="block text-sm"><input type="checkbox" checked={referenceAdvanced} onChange={event => toggleReferenceEditor(event.target.checked)} /> 使用原始数据编辑</label>
        {!referenceAdvanced && <div className="cw-form-stack">{artifact.spec.inputs.map(field => <label key={field.name}>{field.label || field.name}{field.unit && '（' + field.unit + '）'}{field.required !== false && ' *'}{field.type === 'boolean' || field.options?.length ? <select value={referenceDraft[field.name] ?? ''} onChange={event => { setReferenceDraft({ ...referenceDraft, [field.name]: event.target.value }); setReferenceDirty(true) }}><option value="">请选择</option>{(field.options?.length ? field.options : ['true', 'false']).map(value => <option key={value} value={value}>{field.type === 'boolean' ? value === 'true' ? '是' : '否' : value}</option>)}</select> : <input type={field.type === 'number' || field.type === 'integer' ? 'number' : 'text'} step={field.type === 'integer' ? 1 : 'any'} value={referenceDraft[field.name] ?? ''} onChange={event => { setReferenceDraft({ ...referenceDraft, [field.name]: event.target.value }); setReferenceDirty(true) }} />}</label>)}</div>}
        <label hidden={!referenceAdvanced} className="block text-sm">原文示例输入 JSON<textarea value={referenceInputs} onChange={(event) => { setReferenceInputs(event.target.value); setReferenceDirty(true) }} rows={4} className="block w-full border rounded-xl p-3 mt-1 font-mono text-xs" /></label>
        <label className="block text-sm">原文预期结果{artifact.spec.output?.type === 'number' || artifact.spec.output?.type === 'integer' ? <input type="number" step={artifact.spec.output.type === 'integer' ? 1 : 'any'} value={referenceExpected} onChange={event => { setReferenceExpected(event.target.value); setReferenceDirty(true) }} className="block w-full border rounded-xl p-3 mt-1" /> : <textarea value={referenceExpected} onChange={(event) => { setReferenceExpected(event.target.value); setReferenceDirty(true) }} rows={4} className="block w-full border rounded-xl p-3 mt-1 font-mono text-xs" placeholder='复杂结果请保留原始结构，例如：{"score": 0.42}' />}</label>
        <button disabled={busy || artifact.status !== 'ready' || !referenceCitation.trim() || !referenceExpected.trim() || dirty} onClick={() => void checkReference()} className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm disabled:opacity-50">运行原文对照</button>
        {dirty && <p role="status" className="text-sm text-amber-700">请先保存指标设置，再进行原文对照。</p>}
        {referenceDirty && <p role="status" className="text-sm text-amber-700">对照内容已修改，需重新运行对照。</p>}
        {artifact.source.referenceCheck && <p className={artifact.source.referenceCheck.passed ? 'text-sm text-green-700' : 'text-sm text-red-700'}>最近一次对照{artifact.source.referenceCheck.artifactVersion !== artifact.version ? '（旧版本，需重新对照）' : ''}：{artifact.source.referenceCheck.passed ? '通过' : '未通过'}，版本 {artifact.source.referenceCheck.artifactVersion}</p>}
      </fieldset></details>}
      </div>
      <details className="cw-disclosure cw-panel"><summary>最近运行记录</summary>
        <div className="flex justify-between items-center mt-3"><h2 className="font-semibold">状态与耗时</h2><button className="text-sm text-blue-600" onClick={() => void getClinicalRuns(selectedId).then(setRuns).catch(() => toast.error('读取运行记录失败'))}>刷新</button></div>
        <p className="text-xs text-gray-500">仅记录状态和耗时，不保存试用时的输入输出。</p>
        {runs.length ? <ul className="space-y-2">{runs.map((run) => <li key={run.runId} className="text-xs border-b pb-2 text-gray-600">{new Date(run.startedAt).toLocaleString()} · 版本 {run.version} · {run.status === 'succeeded' ? '成功' : run.status === 'failed' ? `失败${run.errorCode ? `（${run.errorCode}）` : ''}` : run.status === 'interrupted' ? '运行中断' : '运行中'}{run.durationMs !== null && run.durationMs !== undefined ? ` · ${run.durationMs} ms` : ''}</li>)}</ul> : <p className="text-sm text-gray-500">暂无试用运行记录</p>}
      </details>
    </>}
  </div>
}
