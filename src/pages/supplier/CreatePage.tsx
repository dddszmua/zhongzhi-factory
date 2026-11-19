import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useUnsavedChanges } from '@/lib/useUnsavedChanges'
import { useAuth } from '@/auth/AuthContext'
import { departments } from '@/lib/departments'
import { PaperPicker } from '@/components/clinical/PaperPicker'
import type { ClinicalPaper } from '@/api/clinicalCatalog'
import {
  createCreationJob, getCreationJob, listCreationJobs, openCreationReference,
  publishCreationJob, sendCreationMessage, startCreationGeneration,
  updateCreationJob, uploadCreationReference,
  type CreationJob, type CreationMode,
} from '@/api/clinicalCreation'

const statusLabel: Record<CreationJob['status'], string> = {
  draft: '待完善', running: '生成中', completed: '已生成', failed: '生成失败',
  interrupted: '任务中断', published: '已保存',
  needs_review: '待补充资料',
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试'
}

export function SupplierCreatePage() {
  const { taskId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [departmentId, setDepartmentId] = useState(() => departments.find(d => d.name === params.get('department') || d.id === params.get('department'))?.id.replace(/^all$/, '') || '')
  const [sourceTab, setSourceTab] = useState<'examples' | 'upload' | 'conversation'>('examples')
  const { user } = useAuth()
  const [job, setJob] = useState<CreationJob | null>(null)
  const [recent, setRecent] = useState<CreationJob[]>([])
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const paperUploadRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [step, setStep] = useState(0)
  const [revising, setRevising] = useState(false)
  const [saveState, setSaveState] = useState('已保存')
  const [dirty, setDirty] = useState(false)
  const [guide, setGuide] = useState({ population: '', inputs: '', output: '' })
  const [guided, setGuided] = useState(true)
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const editVersion = useRef(0)
  const activeTask = useRef(taskId)
  activeTask.current = taskId
  useUnsavedChanges(dirty || Boolean(message.trim()) || (!job?.messages.length && Object.values(guide).some(value => value.trim())))
  const missing = !job ? '' : !job.name.trim() ? '请填写模型名称' : job.mode === 'paper' ? (!job.referenceName ? '请先上传论文' : '') : !job.description.trim() ? '请填写要解决的问题' : ''
  const stage = job?.status === 'published' ? 3 : job?.status === 'running' || (job?.status === 'completed' && !revising) ? 2 : step
  function edit(patch: Partial<CreationJob>) { editVersion.current++; setJob(current => current ? { ...current, ...patch } : current); setDirty(true); setSaveState('尚未保存') }
  function showStep(next: number) { setStep(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const initialRequirement = params.get('requirement') || ''
  const legacyDraft = params.get('draft')

  useEffect(() => {
    if (!user?.id || legacyDraft) return
    let active = true
    setLoading(true)
    setJob(null)
    setBusy(false)
    setSaving(false)
    editVersion.current++
    setRecent([])
    setStep(0)
    setRevising(false)
    setDirty(false)
    setSaveState('已保存')
    setMessage('')
    setGuide({ population: '', inputs: '', output: '' })
    const request = taskId ? getCreationJob(taskId) : listCreationJobs()
    request.then((value) => {
      if (!active) return
      if (Array.isArray(value)) setRecent(value)
      else { setJob(value); if (value.mode !== 'paper' && value.name && value.description) setStep(1) }
    }).catch((error) => { if (active) toast.error(errorText(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [taskId, user?.id, legacyDraft])

  useEffect(() => {
    if (!taskId || job?.status !== 'running') return
    let active = true
    let timer: number
    const poll = async () => {
      try { const next = await getCreationJob(taskId); if (active) { setJob(next); setSaveState('已保存') } }
      catch { if (active) setSaveState('连接暂时中断，正在重试；任务仍保留') }
      if (active) timer = window.setTimeout(poll, 3000)
    }
    timer = window.setTimeout(poll, 3000)
    return () => { active = false; window.clearTimeout(timer) }
  }, [taskId, job?.status])

  async function create(mode: CreationMode) {
    if (!departmentId) { toast.error('请先选择所属科室'); return }
    setBusy(true)
    try {
      const created = await createCreationJob(mode, mode === 'conversation' ? initialRequirement : '', { departmentId })
      navigate(`/supplier/create/task/${created.id}`)
    } catch (error) { toast.error(errorText(error)) }
    finally { setBusy(false) }
  }

  async function usePaper(paper: ClinicalPaper) {
    if (!departmentId || busy) return
    setBusy(true)
    try {
      const created = await createCreationJob('paper', '', { departmentId, paperId: paper.id, paperVersion: paper.version })
      navigate(`/supplier/create/task/${created.id}`)
      toast.success('示例论文已载入，可修改复现要求后直接生成')
    } catch (error) { toast.error(errorText(error)) }
    finally { setBusy(false) }
  }

  function choosePaper() {
    if (!departmentId) { toast.error('请先选择所属科室'); return }
    paperUploadRef.current?.click()
  }

  async function createWithUpload(file: File | undefined) {
    if (!file || busy) return
    if (!/\.(pdf|docx)$/i.test(file.name) || !file.size || file.size > 10 * 1024 * 1024) { toast.error('请选择不超过 10 MB 的非空 PDF 或 DOCX 文件'); return }
    setBusy(true); setUploading(true)
    let created: CreationJob | undefined
    try {
      created = await createCreationJob('paper', '', { departmentId })
      await uploadCreationReference(created.id, file)
      navigate(`/supplier/create/task/${created.id}`)
      toast.success('论文已上传，可填写复现要求后直接生成')
    } catch (error) {
      if (created) navigate(`/supplier/create/task/${created.id}`)
      toast.error(errorText(error))
    } finally { setBusy(false); setUploading(false) }
  }

  async function save(patch: Partial<Pick<CreationJob, 'name' | 'description' | 'notes' | 'referenceReviewed'>>) {
    if (!job) return
    const id = job.id
    const version = editVersion.current
    const fullPatch = { name: job.name, description: job.description, notes: job.notes, referenceReviewed: job.referenceReviewed, ...patch }
    setSaving(true); setSaveState('保存中…')
    const request = saveQueue.current.catch(() => undefined).then(() => updateCreationJob(id, fullPatch))
    saveQueue.current = request
    try {
      const updated = await request
      if (activeTask.current === id && saveQueue.current === request) setJob(current => current?.id === id ? { ...updated, name: current.name, description: current.description, notes: current.notes, referenceReviewed: current.referenceReviewed } : current)
      if (activeTask.current === id && saveQueue.current === request && editVersion.current === version) { setDirty(false); setSaveState('已保存') }
    } catch (error) { if (activeTask.current === id) { setDirty(true); setSaveState('保存失败，请重试'); toast.error(errorText(error)) } }
    finally { if (activeTask.current === id && saveQueue.current === request) setSaving(false) }
  }

  async function send() {
    const text = guided && !job?.messages.length ? [guide.population && '适用人群或场景：' + guide.population, guide.inputs && '可用指标：' + guide.inputs, guide.output && '期望结果：' + guide.output].filter(Boolean).join('\n') : message.trim()
    if (!job || !text) return
    setBusy(true)
    try {
      await saveQueue.current.catch(() => undefined)
      const updated = await sendCreationMessage(job.id, text)
      if (activeTask.current !== job.id) return
      setJob(updated); setDirty(false); setSaveState('已保存')
      setMessage('')
      setGuide({ population: '', inputs: '', output: '' })
    } catch (error) { toast.error(errorText(error)) }
    finally { setBusy(false) }
  }

  async function upload(file: File | undefined) {
    if (!job || !file) return
    if (!/\.(pdf|docx)$/i.test(file.name) || !file.size || file.size > 10 * 1024 * 1024) { toast.error('请选择不超过 10 MB 的非空 PDF 或 DOCX 文件'); return }
    setBusy(true); setUploading(true)
    try {
      await saveQueue.current.catch(() => undefined)
      const uploaded = await uploadCreationReference(job.id, file)
      if (activeTask.current !== job.id) return
      setJob(uploaded)
      setDirty(false); setSaveState('已保存')
      toast.success('论文已上传，可直接生成')
    } catch (error) { toast.error(errorText(error)) }
    finally { setBusy(false); setUploading(false) }
  }

  async function generate() {
    if (!job) return
    setBusy(true)
    try {
      await saveQueue.current.catch(() => undefined)
      const saved = await updateCreationJob(job.id, {
        name: job.name, description: job.description || '依据上传论文复现其中可完整实现的公式或预测模型；缺少必要参数时明确报告。', notes: job.notes,
      })
      setDirty(false); setSaveState('已保存')
      const started = await startCreationGeneration(saved.id)
      if (activeTask.current !== job.id) return
      setJob(started)
      setRevising(false)
    } catch (error) { toast.error(errorText(error)) }
    finally { setBusy(false) }
  }

  async function publish() {
    if (!job) return
    setBusy(true)
    try {
      const saved = await publishCreationJob(job.id)
      if (activeTask.current !== job.id) return
      setJob(saved)
      if (saved.serviceId) navigate(`/supplier/trial?id=${saved.serviceId}`)
    } catch (error) { toast.error(errorText(error)) }
    finally { setBusy(false) }
  }

  if (legacyDraft) return <Navigate replace to={`/supplier/create/legacy?draft=${encodeURIComponent(legacyDraft)}`} />

  return <main className="cw-clinical mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
    <input ref={paperUploadRef} type="file" accept=".pdf,.docx" className="hidden" aria-label="选择要复现的论文文件" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void createWithUpload(file) }} />
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">创建临床模型</h1>
        <p className="mt-1 text-sm text-gray-600">将临床需求或论文中的方法，制作成可试用的模型。</p>
      </div>
      {taskId && <Link to="/supplier/create" className="shrink-0 text-sm text-blue-600">全部任务</Link>}
    </div>

    {loading && <p className="text-sm text-gray-500">正在读取任务…</p>}

    {!loading && !taskId && <>
      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <label className="block font-semibold" htmlFor="create-department">1. 选择所属科室</label>
        <select id="create-department" value={departmentId} disabled={busy} onChange={event => setDepartmentId(event.target.value)} className="w-full rounded-xl border p-3">
          <option value="">请选择科室</option>{departments.slice(1).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <h2 className="font-semibold">2. 选择创建方式</h2>
        <div className="flex flex-wrap gap-2" aria-label="创建方式">
          {([['examples', '使用示例论文'], ['upload', '上传自己的论文'], ['conversation', '描述临床需求']] as const).map(([key, label]) => <button key={key} disabled={busy} aria-pressed={sourceTab === key} onClick={() => setSourceTab(key)} className={'rounded-lg border px-4 py-2 text-sm ' + (sourceTab === key ? 'border-blue-600 bg-blue-50 text-blue-700' : 'text-gray-600')}>{label}</button>)}
        </div>
        {sourceTab === 'examples' && <PaperPicker departmentId={departmentId} busy={busy} onSelect={paper => void usePaper(paper)} />}
        {uploading && <p role="status" className="text-sm text-blue-700">正在上传并保存论文…</p>}
      </section>
      <div className="grid gap-4">
        {sourceTab === 'conversation' &&
        <button disabled={busy} onClick={() => void create('conversation')} className="rounded-2xl border bg-white p-6 text-left shadow-sm hover:border-blue-400 disabled:opacity-50">
          <span className="text-lg font-semibold">我想解决一个临床问题</span>
          <span className="mt-2 block text-sm text-gray-600">用自然语言描述问题，助手追问必要信息并生成算法。</span>
        </button>}
        {sourceTab === 'upload' &&
        <button disabled={busy} onClick={() => choosePaper()} className="rounded-2xl border bg-white p-6 text-left shadow-sm hover:border-blue-400 disabled:opacity-50">
          <span className="text-lg font-semibold">我有一篇论文</span>
          <span className="mt-2 block text-sm text-gray-600">选择 PDF 或 DOCX，上传后填写复现要求并直接生成。</span>
        </button>}
      </div>
      <Link to="/supplier/create/legacy" className="inline-block text-sm text-gray-600 underline">已有 Python 代码？直接上传</Link>
      {recent.length > 0 && <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-3 font-semibold">继续上次的任务</h2>
        <div className="space-y-2">{(showAllRecent ? recent : recent.slice(0, 5)).map((item) => <Link key={item.id} to={`/supplier/create/task/${item.id}`} className="flex justify-between gap-3 rounded-xl border p-3 text-sm hover:border-blue-400"><span className="min-w-0 break-words">{item.name || item.referenceName || (item.mode === 'paper' ? '论文复现' : '对话创建')}</span><span className="shrink-0 text-right text-gray-500">{statusLabel[item.status]}<small className="block mt-1">{new Date(item.updatedAt).toLocaleDateString()}</small></span></Link>)}</div>
        {recent.length > 5 && <button className="mt-3 text-sm text-blue-700" onClick={() => setShowAllRecent(!showAllRecent)}>{showAllRecent ? '收起历史任务' : '查看更多历史任务'}</button>}
      </section>}
    </>}

    {!loading && taskId && !job && <p className="rounded-xl border bg-white p-4 text-sm text-red-600">任务未找到或当前账号无权查看。</p>}

    {job && <>
      <section className="rounded-xl border bg-white p-4 text-sm space-y-2">
        <label htmlFor="job-department" className="font-semibold">所属科室</label>
        <select id="job-department" value={job.departmentId || ''} disabled={busy || job.status === 'running' || job.status === 'published'} className="ml-3 rounded-lg border p-2" onChange={async event => {
          const id = event.target.value
          setBusy(true)
          try { await saveQueue.current.catch(() => undefined); const updated = await updateCreationJob(job.id, { departmentId: id }); setJob(current => current ? { ...current, departmentId: updated.departmentId, intake: updated.intake, status: updated.status, result: updated.result } : updated) }
          catch (error) { toast.error(errorText(error)) } finally { setBusy(false) }
        }}><option value="" disabled>待归类</option>{departments.slice(1).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        {job.intake.catalog?.paperId && <p className="text-gray-600">示例论文与复现要求已带入，可按需修改后直接生成。</p>}
      </section>
      <ol className="cw-steps" aria-label="模型创建阶段">
        {(job.mode === 'paper' ? ['论文与要求', '生成并保存', '试用验证'] : ['提供材料', '核对内容', '生成并保存', '试用验证']).map((label, index) => {
          const currentStage = job.mode === 'paper' ? stage < 2 ? 0 : stage - 1 : stage
          return <li key={label} aria-current={currentStage === index ? 'step' : undefined}><span className="mr-2">{index + 1}</span>{label}</li>
        })}
      </ol>
      <div className="cw-task-status">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{job.mode === 'paper' ? '论文复现' : '对话创建'}</h2>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">{statusLabel[job.status]}</span>
        </div>
        <p className="text-xs text-gray-500">{saveState} · 可从“创建与任务”返回</p>
      </div>

      {stage < 2 && step === 0 && job.mode === 'conversation' && <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-3 font-semibold">描述您的临床需求</h2>
        {!job.messages.length && <><div className="cw-filter-chips"><button aria-pressed={guided} onClick={() => setGuided(true)}>按提示填写</button><button aria-pressed={!guided} onClick={() => setGuided(false)}>直接描述</button></div>
        {guided && <div className="cw-form-stack">{([['population', '用于什么人群或场景？', '例如：成人门诊体重管理'], ['inputs', '有哪些可用指标？', '例如：身高（cm）、体重（kg）'], ['output', '希望得到什么结果？', '例如：计算 BMI']] as const).map(([key, label, hint]) => <label key={key}>{label}<textarea rows={2} maxLength={1200} value={guide[key]} placeholder={hint} onChange={event => setGuide({ ...guide, [key]: event.target.value })} disabled={busy} /></label>)}</div>}</>}
        {job.messages.length > 0 && <details className="cw-disclosure"><summary>查看历史对话（{job.messages.length} 条）</summary><div className="max-h-80 space-y-3 overflow-auto">{job.messages.map((item, index) => <div key={index} className={`rounded-xl p-3 text-sm ${item.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'}`}><span className="mb-1 block text-xs font-medium text-gray-500">{item.role === 'user' ? '你' : '生成助手'}</span><p className="whitespace-pre-wrap">{item.text}</p></div>)}</div></details>}
        {job.messages[job.messages.length - 1]?.role === 'assistant' && <div className="cw-notice whitespace-pre-wrap">{job.messages[job.messages.length - 1]?.text}</div>}
        {(!guided || job.messages.length > 0) && <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} maxLength={4000} placeholder="描述适用人群、需要输入的指标，以及您希望得到的结果。" disabled={busy || job.status === 'running' || job.status === 'published'} className="mt-4 w-full rounded-xl border p-3 text-sm" />}
        <button onClick={() => void send()} disabled={busy || (guided && !job.messages.length ? !Object.values(guide).some(value => value.trim()) : !message.trim()) || job.status === 'running' || job.status === 'published'} className="mt-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? '正在整理…' : job.messages.length ? '补充说明' : '整理需求'}</button>
      </section>}

      {stage < 2 && job.mode === 'paper' && <section className="space-y-4 rounded-2xl border bg-white p-5">
        <h2 className="font-semibold">{job.referenceName ? '论文已就绪' : '上传论文'}</h2>
        {job.referenceName ? <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm">
          <span className="min-w-0 break-all font-medium">{job.referenceName}</span>
          <span className="text-green-700">已保存</span>
          <button type="button" className="text-blue-700 underline" onClick={() => void openCreationReference(job.id, job.referenceName).catch(error => toast.error(errorText(error)))}>下载论文</button>
        </div> : <p className="text-sm text-gray-500">支持 PDF 或 DOCX，最多 10 MB。</p>}
        <label className="inline-flex cursor-pointer rounded-lg border px-3 py-2 text-sm text-blue-700">
          {uploading ? '正在上传…' : job.referenceName ? '更换论文' : '选择论文文件'}
          <input type="file" aria-label={job.referenceName ? '更换论文' : '选择论文文件'} accept=".pdf,.docx" disabled={busy || saving} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(file) }} className="sr-only" />
        </label>
        <fieldset disabled={busy} className="space-y-4">
          <label className="block text-sm">模型名称<input value={job.name} maxLength={100} onChange={event => edit({ name: event.target.value })} onBlur={() => void save({ name: job.name })} placeholder="上传后自动填写，可修改" className="mt-1 w-full rounded-xl border p-2.5" /></label>
          <label className="block text-sm font-medium">希望复现的部分（选填）<textarea value={job.notes} maxLength={5000} onChange={event => edit({ notes: event.target.value })} onBlur={() => void save({ notes: job.notes })} placeholder="例如：只复现表 2 的评分公式，输入年龄和检查指标，输出总分及风险分层。留空则由系统识别论文中的可复现方法。" rows={5} className="mt-2 w-full rounded-xl border p-3 font-normal" /></label>
          <p className="text-xs text-gray-500">{saveState} · 点击生成会保存当前复现要求。</p>
          {missing && <p role="status" className="text-sm text-gray-600">{missing}</p>}
          <button disabled={busy || Boolean(missing)} onClick={() => void generate()} className="cw-button disabled:opacity-50">{uploading ? '正在上传…' : busy ? '正在提交…' : job.status === 'completed' ? '重新生成模型' : '生成模型'}</button>
        </fieldset>
      </section>}

      {stage < 2 && step === 0 && job.mode === 'conversation' && <div className="cw-step-actions"><button className="cw-button" disabled={busy || saving || (job.mode === 'conversation' && (Boolean(message.trim()) || (!job.messages.length && Object.values(guide).some(value => value.trim()))))} onClick={() => showStep(1)}>继续，核对需求</button><span role="status" className="text-xs text-gray-500">填写了内容后，请先点击“整理需求”或“补充说明”</span></div>}
      {stage < 2 && step === 1 && job.mode === 'conversation' && <section className="space-y-4 rounded-2xl border bg-white p-5"><fieldset disabled={busy} className="space-y-4">
        <h2 className="font-semibold">核对模型需求</h2><p className="text-sm text-gray-500">确认人群、指标及期望结果。未提供的信息请补充到问题描述中。</p>
        <label className="block text-sm">模型名称<input value={job.name} maxLength={100} onChange={(event) => edit({ name: event.target.value })} onBlur={() => void save({ name: job.name })} placeholder="例如：成人 BMI 计算" className="mt-1 w-full rounded-xl border p-2.5" /></label>
        <label className="block text-sm">要解决的问题<textarea value={job.description} maxLength={10000} onChange={(event) => edit({ description: event.target.value })} onBlur={() => void save({ description: job.description })} rows={3} placeholder="输入是什么，希望得到什么结果？" className="mt-1 w-full rounded-xl border p-2.5" /></label>
        {job.intake.formDraft && Object.keys(job.intake.formDraft).length > 0 && <p className="text-xs text-gray-600">助手已整理需求。请核对上面的名称和问题描述，必要时继续对话修改。</p>}
        <p className="text-xs text-gray-500">{saveState}</p>
        {dirty && !saving && <button className="text-sm text-blue-700" onClick={() => void save({ name: job.name, description: job.description, notes: job.notes, referenceReviewed: job.referenceReviewed })}>保存当前内容</button>}
        {missing && <p role="status" className="text-sm text-amber-700">{missing}</p>}
        <div className="cw-step-actions"><button className="cw-button secondary" disabled={busy} onClick={() => showStep(0)}>返回材料与对话</button><button disabled={busy || saving || !job.name.trim() || !job.description.trim()} onClick={() => void generate()} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? '正在提交…' : job.status === 'completed' ? '重新生成' : job.status === 'failed' || job.status === 'interrupted' ? '重新开始生成' : '确认并生成'}</button></div></fieldset>
      </section>}

      {job.status === 'running' && <section className="rounded-2xl border bg-white p-5" aria-live="polite"><h2 className="font-semibold">正在生成</h2><p className="mt-2 text-sm text-gray-700">{job.progressText || '正在等待处理'}</p><p className="mt-2 text-xs text-gray-500">可离开页面，稍后从“创建与任务”返回。</p><p role="status" className="mt-2 text-xs text-gray-500">最近更新：{new Date(job.updatedAt).toLocaleString()} · {saveState}</p></section>}
      {(job.status === 'failed' || job.status === 'interrupted') && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{job.error || '生成未完成，请检查内容后重试。'}</p>}
      {job.status === 'needs_review' && <section role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><h2 className="font-semibold">需要补充或核对资料</h2><p className="mt-2">{job.error}</p><p className="mt-2 text-gray-600">已保留提取结果。请在上方补充要求中说明原文规则或上传完整资料，再开始生成。</p></section>}
      {!!job.result?.reproduction?.evidence?.rules?.length && <details className="rounded-xl border bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">核对论文规则与出处</summary><p className="mt-2 text-xs text-gray-500">以下为自动提取内容，出处完整不代表医学正确性已经审定。</p><ol className="mt-3 space-y-3">{job.result.reproduction.evidence.rules.map((rule, index) => <li key={rule.id || index} className="border-t pt-3 text-sm"><p>{rule.rule}</p><p className="mt-1 text-xs text-gray-600">第 {rule.source?.page ?? '待核对'} 页 · {rule.source?.location || '出处待补充'}{rule.unit ? ` · 单位：${rule.unit}` : ''}</p>{rule.source?.kind === "supplied_transcription" && <p className="mt-1 text-xs text-amber-700">来源：补充转录，尚未经独立医学审定</p>}{rule.source?.quote && <blockquote className="mt-1 text-xs text-gray-500">{rule.source.quote}</blockquote>}</li>)}</ol></details>}

      {(job.status === 'completed' || job.status === 'published') && !revising && job.result && <section className="space-y-3 rounded-2xl border bg-white p-5">
        <h2 className="font-semibold">{job.status === 'published' ? '模型已保存' : '模型已生成，请核对后保存'}</h2>
        <dl className="cw-summary"><div><dt>模型名称</dt><dd>{job.result.model_name || job.name}</dd></div><div><dt>适用范围</dt><dd>{job.result.algorithm_spec?.clinicalScope || job.result.model_summary?.usage_scenarios?.join('；') || '尚未提供，请在试用前核对'}</dd></div><div><dt>输入指标</dt><dd>{job.result.algorithm_spec?.inputs?.map(field => (field.label || field.name) + (field.unit ? '（' + field.unit + '）' : '')).join('、') || job.result.model_summary?.input_description || '尚待完善'}</dd></div><div><dt>输出结果</dt><dd>{job.result.algorithm_spec?.output?.description || job.result.model_summary?.output_description || '尚待完善'}</dd></div></dl>
        <p className="text-sm">{job.result.model_summary?.purpose || job.description}</p>
        {job.mode === 'paper' && <p className="text-sm text-amber-700">已生成计算实现，仍需对照论文核对。合成样例和模型自行编写的测试不等于独立临床验证。</p>}
        <p className="text-xs text-gray-600">{job.result.algorithm_spec?.inputs?.length && job.result.smoke_input ? '已提供输入规范与合成样例；保存时将运行样例验证。' : '运行规范尚不完整；保存后需在试用配置页补充。'}</p>
        {job.result.model_summary?.limitations && <p className="text-sm text-amber-700">限制：{job.result.model_summary.limitations}</p>}
        <details><summary className="cursor-pointer text-sm text-blue-600">技术详情：运行规范与源码</summary><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-xs">{JSON.stringify(job.result.algorithm_spec || {}, null, 2)}\n\n{job.result.generated_code}</pre></details>
        {job.status === 'completed' && <button onClick={() => void publish()} disabled={busy} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? '保存中…' : '保存并试用'}</button>}
      </section>}
      {job.status === 'published' && job.serviceId && <Link to={`/supplier/trial?id=${job.serviceId}`} className="inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">进入在线试用</Link>}
      {job.status === 'completed' && !revising && <button className="cw-button secondary" disabled={busy} onClick={() => { if (window.confirm('修改并保存需求后，原生成结果会失效，需要重新生成。是否继续修改？')) { setRevising(true); showStep(1) } }}>返回修改需求</button>}
      <details className="cw-disclosure"><summary>任务详情</summary><p className="text-xs text-gray-500">任务 ID：{job.id} · 更新时间：{new Date(job.updatedAt).toLocaleString()} · {saveState}</p></details>
    </>}
  </main>
}
