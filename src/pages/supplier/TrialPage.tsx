import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { ClinicalTrialPanel } from '@/components/product/ClinicalTrialPanel'
import { checkClinicalReference, configureClinicalArtifact, getClinicalArtifact, getMyAlgorithmModels, setClinicalTrialEnabled, type ClinicalAlgorithmArtifact } from '@/api/services'
import type { BackendService } from '@/lib/mappers'

export function SupplierTrialPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('id') || ''
  const [models, setModels] = useState<BackendService[]>([])
  const [artifact, setArtifact] = useState<ClinicalAlgorithmArtifact | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [specText, setSpecText] = useState('')
  const [smokeText, setSmokeText] = useState('{}')
  const [referenceInputs, setReferenceInputs] = useState('{}')
  const [referenceExpected, setReferenceExpected] = useState('')
  const [referenceCitation, setReferenceCitation] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    getMyAlgorithmModels(user.id).then((items) => {
      if (!active) return
      const clinical = items.filter((item) => item.domain === 'health' && item.status !== 'draft')
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
      setSpecText(JSON.stringify(item.spec, null, 2))
      setSmokeText(JSON.stringify(item.smokeInput || {}, null, 2))
      setReferenceInputs(JSON.stringify(item.smokeInput || {}, null, 2))
      setReferenceCitation(item.source?.referenceCheck?.citation || '')
      setReferenceExpected(item.source?.referenceCheck ? JSON.stringify(item.source.referenceCheck.expected, null, 2) : '')
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : '读取模型规范失败') })
    return () => { active = false }
  }, [selectedId, revision])

  async function configure() {
    if (!selectedId) return
    setBusy(true)
    try {
      const spec = JSON.parse(specText) as ClinicalAlgorithmArtifact['spec']
      const smokeInput = JSON.parse(smokeText) as Record<string, unknown>
      if (!spec || !Array.isArray(spec.inputs) || !smokeInput || typeof smokeInput !== 'object' || Array.isArray(smokeInput)) throw new Error('输入规范或合成样例格式错误')
      const updated = await configureClinicalArtifact(selectedId, spec, smokeInput)
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
      const inputs = JSON.parse(referenceInputs) as Record<string, unknown>
      const expected = JSON.parse(referenceExpected) as unknown
      const units = Object.fromEntries(artifact.spec.inputs.filter((field) => field.unit).map((field) => [field.name, field.unit!]))
      const report = await checkClinicalReference(selectedId, { citation: referenceCitation.trim(), inputs, expected, absoluteTolerance: 1e-6, relativeTolerance: 1e-6, units })
      setArtifact({ ...artifact, source: { ...artifact.source, referenceCheck: report } })
      toast[report.passed ? 'success' : 'error'](report.passed ? '原文对照通过' : '实际输出与原文预期不一致')
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : '原文对照失败') }
    finally { setBusy(false) }
  }

  return <div className="max-w-5xl p-6 lg:p-8 space-y-6">
    <button onClick={() => navigate('/supplier')} className="text-sm text-blue-600">← 返回研发工作台</button>
    <div><h1 className="text-2xl font-bold">模型运行与在线试用</h1><p className="text-sm text-gray-500 mt-1">作者可测试私有版本。目录审核通过且允许公开试用后，其他登录用户才能调用。</p></div>
    <section className="bg-white border rounded-2xl p-5">
      <label className="text-sm font-semibold">选择模型<select value={selectedId} onChange={(event) => setParams({ id: event.target.value })} className="block w-full border rounded-xl p-2 mt-2"><option value="">请选择</option>{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
      {!loading && models.length === 0 && <p className="text-sm text-gray-500 mt-3">还没有可配置的临床模型。<button onClick={() => navigate('/supplier/create')} className="text-blue-600 ml-1">提交模型</button></p>}
      {error && <p role="alert" className="text-red-600 text-sm mt-3">{error}</p>}
    </section>
    {artifact && <>
      <section className="bg-white border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">运行状态：{artifact.status === 'ready' ? '样例验证通过' : '待配置或验证失败'}</h2>
        <p className="text-sm text-gray-500">版本 {artifact.version}。{artifact.validationError || '输入规范与源码已绑定到同一版本。'}</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(artifact.publicTrialEnabled)} onChange={() => void toggleTrial()} disabled={busy} /> 目录审核通过后允许其他已授权用户试用</label>
      </section>
      <section className="bg-white border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">配置运行规范</h2><p className="text-xs text-gray-500">输入字段名称和顺序必须与 Python 的 main_process 参数一致。请用合成数据填写样例，保存后平台会实际运行。</p>
        <label className="block text-sm">输入输出规范 JSON<textarea value={specText} onChange={(event) => setSpecText(event.target.value)} rows={10} className="block w-full border rounded-xl p-3 mt-1 font-mono text-xs" /></label>
        <label className="block text-sm">合成样例 JSON<textarea value={smokeText} onChange={(event) => setSmokeText(event.target.value)} rows={5} className="block w-full border rounded-xl p-3 mt-1 font-mono text-xs" /></label>
        <button disabled={busy} onClick={() => void configure()} className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm disabled:opacity-50">{busy ? '验证中…' : '保存并运行样例验证'}</button>
      </section>
      {artifact.source?.reproductionMode && <section className="bg-white border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">原文结果对照</h2>
        <p className="text-xs text-gray-500">填写论文或专利中的独立计算示例。平台会运行当前版本并按绝对或相对误差 1e-6 对照；公开审核要求对照通过。</p>
        <label className="block text-sm">原文页码、公式号或实施例<input value={referenceCitation} onChange={(event) => setReferenceCitation(event.target.value)} className="block w-full border rounded-xl p-3 mt-1" placeholder="例如：第 4 页公式 (3)，实施例 1" /></label>
        <label className="block text-sm">原文示例输入 JSON<textarea value={referenceInputs} onChange={(event) => setReferenceInputs(event.target.value)} rows={4} className="block w-full border rounded-xl p-3 mt-1 font-mono text-xs" /></label>
        <label className="block text-sm">原文预期输出 JSON<textarea value={referenceExpected} onChange={(event) => setReferenceExpected(event.target.value)} rows={4} className="block w-full border rounded-xl p-3 mt-1 font-mono text-xs" placeholder='例如：0.42 或 {"score": 0.42}' /></label>
        <button disabled={busy || artifact.status !== 'ready'} onClick={() => void checkReference()} className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm disabled:opacity-50">运行原文对照</button>
        {artifact.source.referenceCheck && <p className={artifact.source.referenceCheck.passed ? 'text-sm text-green-700' : 'text-sm text-red-700'}>最近一次对照：{artifact.source.referenceCheck.passed ? '通过' : '未通过'}，版本 {artifact.source.referenceCheck.artifactVersion}</p>}
      </section>}
      <ClinicalTrialPanel key={`${selectedId}-${revision}`} modelId={selectedId} isAuthenticated />
    </>}
  </div>
}
