import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft, Check, Cpu, Eye, Loader2, Sparkles, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { streamAutoGenerate, uploadScenarioGenerated, type AmlGenerateResult } from '@/api/scenarioDev'
import { useAuth } from '@/auth/AuthContext'
import { Btn } from '@/components/ui/Btn'
import { DOMAIN_OPTIONS, INDUSTRY_OPTIONS, BLUE, GREEN } from '@/lib/constants'
import { mapAgentStepToFriendly, PROGRESS_STEPS } from '@/lib/scenarioConfig'
import { buildDemoGenerateResult, isDemoGenerateName } from '@/lib/demoGenerate'
import { buildCreatePayload } from '@/lib/mappers'
import { createService, getMyAlgorithmModels, updateService } from '@/api/services'

const DRAFT_PREFIX = 'ZZF_DRAFT_V1:'

/** 首期 4 步（价格/认证不做）——保持原设计交互 */
const STEPS = ['填写业务信息', '配置输入输出', '上传模型或AI生成算法', '配置在线试用']

const INPUT_OPTIONS = ['Excel / CSV 数据表', 'Word / PDF 文档', '图片', '视频', '数据库 / API', '文本']
const OUTPUT_OPTIONS = ['分析报告', '风险清单', '分类结果', '预测结果', '图表', '结构化 JSON']
const SCENARIO_OPTIONS = ['反洗钱', '客户流失预测', '产品缺陷识别', '合同审核', '问卷分析', '数据报告', '其他']

type SourceMode = 'upload' | 'generate' | null

export function SupplierCreatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const draftId = params.get('draft') || ''
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const [form, setForm] = useState({
    name: '',
    tagline: '',
    domain: 'aml',
    industry: '金融风控',
    scenario: '反洗钱',
    problem: '',
    suitable: '',
    unsuitable: '',
    inputTypes: ['Excel / CSV 数据表'] as string[],
    outputTypes: ['风险清单'] as string[],
  })

  const [sourceMode, setSourceMode] = useState<SourceMode>(null)
  const [files, setFiles] = useState<File[]>([])
  const [allowTrial, setAllowTrial] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 仅生成能力（不改成想定式整页）
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState('')
  const [friendlyStep, setFriendlyStep] = useState(1)
  const [genResult, setGenResult] = useState<AmlGenerateResult | null>(null)
  const [publishedId, setPublishedId] = useState<string | null>(null)
  const agentTickRef = useRef(0)

  useEffect(() => {
    if (!draftId || !user?.id) return
    getMyAlgorithmModels(user.id).then((items) => {
      const draft = items.find((item) => item.id === draftId && item.status === 'draft')
      if (!draft) throw new Error('草稿不存在或无权编辑')
      const encoded = draft.source?.companyIntroduce || ''
      if (!encoded.startsWith(DRAFT_PREFIX)) throw new Error('草稿格式无法识别')
      const saved = JSON.parse(encoded.slice(DRAFT_PREFIX.length)) as Partial<typeof form>
      setForm((current) => ({ ...current, ...saved, name: draft.name }))
    }).catch((error) => toast.error(error instanceof Error ? error.message : '草稿加载失败'))
  }, [draftId, user?.id])

  async function saveDraft() {
    if (!user?.id) return
    if (!form.name.trim()) {
      toast.error('请先填写算法商品名称')
      setStep(0)
      return
    }
    setSaving(true)
    try {
      const description = form.problem.trim() || form.tagline.trim()
      const payload = buildCreatePayload({
        name: form.name.trim(), description, domain: form.domain, industry: form.industry,
        scenario: form.scenario, inputType: form.inputTypes.join(' / '), outputType: form.outputTypes.join(' / '),
      })
      const source = { ...payload.source, companyIntroduce: `${DRAFT_PREFIX}${JSON.stringify(form)}`, msIntroduce: description }
      const saved = draftId
        ? await updateService(draftId, { name: payload.name, domain: payload.domain, industry: payload.industry, scenario: payload.scenario, source })
        : await createService({ ...payload, status: 'draft', source })
      if (!draftId && saved?.id) navigate(`/supplier/create?draft=${saved.id}`, { replace: true })
      toast.success('草稿已保存。文件和 AI 生成结果需要在发布前重新选择或生成。')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存草稿失败')
    } finally {
      setSaving(false)
    }
  }

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
  }

  function validateStep(s = step) {
    if (s === 0) {
      if (!form.name.trim()) {
        toast.error('请填写算法商品名称')
        return false
      }
      if (!form.tagline.trim() && !form.problem.trim()) {
        toast.error('请填写一句话说明或业务问题')
        return false
      }
    }
    if (s === 1 && (!form.inputTypes.length || !form.outputTypes.length)) {
      toast.error('请至少选择一种输入和输出类型')
      return false
    }
    if (s === 2) {
      if (!sourceMode) {
        toast.error('请选择算法来源：上传文件或 AI 生成')
        return false
      }
      if (sourceMode === 'upload' && files.length === 0) {
        toast.error('请上传算法包或源码文件')
        return false
      }
      if (sourceMode === 'generate' && !genResult?.generated_code) {
        toast.error('请先完成 AI 生成')
        return false
      }
    }
    return true
  }

  async function runGenerate() {
    if (!form.name.trim() || !(form.problem.trim() || form.tagline.trim())) {
      toast.error('请先完善第 1 步的名称与业务描述')
      setStep(0)
      return
    }
    abortRef.current?.abort()
    setGenerating(true)
    setGenResult(null)
    setPublishedId(null)
    setFriendlyStep(1)
    setGenMsg('正在根据业务描述生成算法模型…')
    agentTickRef.current = 0

    const modelName = form.name.trim()

    // 演示：名称以 wst 开头 → 本地 mock，约 20 秒后完成（不调线上 Agent）
    if (isDemoGenerateName(modelName)) {
      const controller = new AbortController()
      abortRef.current = controller
      const started = Date.now()
      const totalMs = 20000
      const timer = window.setInterval(() => {
        if (controller.signal.aborted) {
          window.clearInterval(timer)
          return
        }
        const elapsed = Date.now() - started
        const tick = Math.min(5, Math.floor((elapsed / totalMs) * 5) + 1)
        agentTickRef.current = tick
        const mapped = mapAgentStepToFriendly(tick)
        setFriendlyStep(mapped.step)
        setGenMsg(mapped.message)
      }, 400)

      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => resolve(), totalMs)
          controller.signal.addEventListener('abort', () => {
            window.clearTimeout(timeout)
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
      } catch {
        window.clearInterval(timer)
        setGenerating(false)
        setGenMsg('已取消生成')
        return
      }
      window.clearInterval(timer)

      const raw = buildDemoGenerateResult(modelName, form.tagline, form.problem)
      setGenResult(raw)
      setFriendlyStep(5)
      setGenMsg('生成完成，可进入下一步上架')
      setGenerating(false)
      toast.success('算法模型已生成')
      return
    }

    const narrative = [form.tagline.trim(), form.problem.trim(), form.suitable.trim(), `输入：${form.inputTypes.join(' / ')}`, `输出：${form.outputTypes.join(' / ')}`]
      .filter(Boolean)
      .join('\n')

    const fd = new FormData()
    fd.append('model_name', modelName)
    fd.append('free_narrative', narrative)
    fd.append('industry', form.industry)
    fd.append('scenario', form.scenario)
    fd.append('technology', 'AI')
    fd.append('algorithm_category', 'classification')
    fd.append(
      'category_params',
      JSON.stringify({
        inputTypes: form.inputTypes,
        outputTypes: form.outputTypes,
        notes: form.unsuitable.trim() || undefined,
      }),
    )

    await streamAutoGenerate(fd, {
      onAbortController: (c) => {
        abortRef.current = c
      },
      onStep: () => {
        agentTickRef.current += 1
        const mapped = mapAgentStepToFriendly(agentTickRef.current)
        setFriendlyStep(mapped.step)
        setGenMsg(mapped.message)
      },
      onError: (error) => {
        setGenerating(false)
        setGenMsg(error)
        toast.error(error)
      },
      onWarning: (warning) => {
        setGenerating(false)
        setGenMsg(warning)
        toast.message(warning)
      },
      onFinalResult: (results) => {
        const raw = (results.aml_generate_result || results) as AmlGenerateResult
        if (!raw.generated_code?.trim()) {
          setGenerating(false)
          toast.error('生成结果缺少源码')
          return
        }
        setGenResult({
          ...raw,
          model_name: raw.model_name || modelName,
          code_filename: raw.code_filename || `${modelName}_algorithm.py`,
        })
        setFriendlyStep(5)
        setGenMsg('生成完成，可进入下一步上架')
        setGenerating(false)
        toast.success('算法模型已生成')
      },
    })
  }

  async function submit() {
    if (!validateStep(3) && step !== 3) {
      /* allow submit from step 3 */
    }
    if (!validateStep(2)) return

    setSaving(true)
    try {
      const description = form.problem.trim() || form.tagline.trim()
      const name = form.name.trim()

      // 路径 A：AI 生成 → 登记 generated_algorithm
      if (sourceMode === 'generate' && genResult?.generated_code) {
        const blob = new Blob([genResult.generated_code], { type: 'text/x-python' })
        const fd = new FormData()
        fd.append('file', blob, genResult.code_filename || `${name}_algorithm.py`)
        fd.append('name', name)
        fd.append('domain', form.domain)
        fd.append('industry', form.industry)
        fd.append('scenario', form.scenario)
        fd.append('technology', 'AI')
        fd.append('attribute', 'custom')
        if (draftId) fd.append('draft_id', draftId)
        fd.append(
          'source',
          JSON.stringify({
            popoverTitle: name,
            companyName: '众智工场供应商',
            msIntroduce: description,
            companyIntroduce: form.tagline.trim() || description,
          }),
        )
        const res = await uploadScenarioGenerated(fd)
        setPublishedId(res?.service?.id || null)
        toast.success('算法商品已保存，可在「我的算法商品」中查看')
        return
      }

      // 路径 B：源码、可选测试脚本和数据集分别交给后端登记。
      if (sourceMode === 'upload' && files.length > 0) {
        const scripts = files.filter((file) => file.name.toLowerCase().endsWith('.py'))
        const datasets = files.filter((file) => /\.(csv|tsv|json|txt|xlsx|parquet)$/i.test(file.name))
        if (!scripts.length) {
          toast.message('请至少包含一个 .py 源码文件，或改用「AI 生成」')
          return
        }
        if (scripts.length > 2 || datasets.length > 1 || scripts.length + datasets.length !== files.length) {
          toast.error('请上传 1 个主源码、至多 1 个测试脚本和 1 个受支持的数据集')
          return
        }
        const primary = scripts[0]
        const fd = new FormData()
        fd.append('file', primary)
        if (scripts[1]) fd.append('test_file', scripts[1])
        if (datasets[0]) fd.append('dataset_file', datasets[0])
        fd.append('name', name)
        fd.append('domain', form.domain)
        fd.append('industry', form.industry)
        fd.append('scenario', form.scenario)
        fd.append('technology', 'AI')
        fd.append('attribute', 'custom')
        if (draftId) fd.append('draft_id', draftId)
        const res = await uploadScenarioGenerated(fd)
        setPublishedId(res?.service?.id || null)
        toast.success('算法商品及所选配套文件已保存，可在「我的算法商品」中查看')
        return
      }

      toast.error('请选择上传文件或完成 AI 生成后再提交')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const previewName = form.name || '算法商品名称'
  const previewDesc = form.tagline || form.problem || '一句话说明将展示在这里'

  return (
    <div className="p-6 lg:p-8" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <button onClick={() => navigate('/supplier')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6">
        <ArrowLeft size={14} /> 返回供应商中心
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">{draftId ? '继续编辑算法草稿' : '创建算法商品'}</h1>
        <p className="text-sm text-gray-500 mt-1">
          请用业务语言说明这个算法能解决什么问题。平台会根据你的描述生成商品页与试用配置。
        </p>
      </div>

      {/* Stepper — 原设计风格 */}
      <div className="bg-white rounded-2xl border border-black/5 p-4 mb-6 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                  i === step ? 'text-white' : i < step ? 'text-green-700 bg-green-50' : 'text-gray-400'
                }`}
                style={i === step ? { background: BLUE } : undefined}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === step ? 'bg-white text-blue-600' : i < step ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {i < step ? <Check size={10} /> : i + 1}
                </span>
                {s}
              </div>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-5 min-w-0">
          {/* Step 1 */}
          {step === 0 && (
            <>
              <div className="bg-white rounded-2xl border border-black/5 p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: BLUE }}>
                    1
                  </span>
                  基础信息
                </h2>
                <div className="space-y-4">
                  <Field label="算法商品名称" required>
                    <input
                      className="input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="例如：跨境支付异常交易识别模型"
                    />
                  </Field>
                  <Field label="一句话说明" required>
                    <input
                      className="input"
                      value={form.tagline}
                      onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                      placeholder="例如：根据交易记录识别异常支付、风险交易和可疑行为。"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="适用行业">
                      <select className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                        {INDUSTRY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="适用场景">
                      <select className="input" value={form.scenario} onChange={(e) => setForm({ ...form, scenario: e.target.value })}>
                        {SCENARIO_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="领域空间">
                      <select className="input" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })}>
                        {DOMAIN_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-black/5 p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: BLUE }}>
                    2
                  </span>
                  业务问题描述
                </h2>
                <Field label="这个算法解决什么业务问题？">
                  <textarea
                    className="input"
                    rows={5}
                    value={form.problem}
                    onChange={(e) => setForm({ ...form, problem: e.target.value })}
                    placeholder="请描述业务人员能理解的问题，例如：企业每天有大量跨境支付交易，需要自动识别可疑交易并输出风险等级…"
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <Field label="适用场景说明">
                    <textarea className="input" rows={3} value={form.suitable} onChange={(e) => setForm({ ...form, suitable: e.target.value })} placeholder="适合什么业务场景" />
                  </Field>
                  <Field label="不适用场景">
                    <textarea className="input" rows={3} value={form.unsuitable} onChange={(e) => setForm({ ...form, unsuitable: e.target.value })} placeholder="请明确算法边界，避免买家误用" />
                  </Field>
                </div>
              </div>
            </>
          )}

          {/* Step 2: I/O */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-black/5 p-6 space-y-5">
              <h2 className="font-bold text-gray-900">配置输入输出</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-100 p-4">
                  <div className="text-xs font-semibold text-gray-700 mb-3">用户需要准备什么？</div>
                  <div className="flex flex-wrap gap-2">
                    {INPUT_OPTIONS.map((opt) => (
                      <Chip key={opt} active={form.inputTypes.includes(opt)} onClick={() => setForm({ ...form, inputTypes: toggle(form.inputTypes, opt) })}>
                        {opt}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 p-4">
                  <div className="text-xs font-semibold text-gray-700 mb-3">用户会得到什么结果？</div>
                  <div className="flex flex-wrap gap-2">
                    {OUTPUT_OPTIONS.map((opt) => (
                      <Chip key={opt} active={form.outputTypes.includes(opt)} onClick={() => setForm({ ...form, outputTypes: toggle(form.outputTypes, opt) })}>
                        {opt}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: source — 设计原交互 + 嵌入生成能力 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-black/5 p-6">
                <h2 className="font-bold text-gray-900 mb-1">上传模型或AI生成算法</h2>
                <p className="text-xs text-gray-500 mb-4">选择一种方式提供算法能力。</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <SourceCard
                    active={sourceMode === 'upload'}
                    icon={UploadCloud}
                    title="上传算法文件"
                    desc="上传 .py 源码文件"
                    color={BLUE}
                    onClick={() => setSourceMode('upload')}
                  />
                  <SourceCard
                    active={sourceMode === 'generate'}
                    icon={Sparkles}
                    title="AI 生成算法"
                    desc="根据前面业务描述自动生成"
                    color={GREEN}
                    onClick={() => setSourceMode('generate')}
                  />
                </div>
              </div>

              {sourceMode === 'upload' && (
                <div className="bg-white rounded-2xl border border-black/5 p-5">
                  <Field label="选择文件（主源码 .py，可选测试 .py 和数据集）">
                    {/* 隐藏原生 input，避免「未选择文件」可点且切换后显示丢失 */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".py,.csv,.tsv,.json,.txt,.xlsx,.parquet"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const picked = Array.from(e.target.files || [])
                        if (picked.length) {
                          setFiles((prev) => {
                            const map = new Map(prev.map((f) => [`${f.name}-${f.size}`, f]))
                            picked.forEach((f) => map.set(`${f.name}-${f.size}`, f))
                            return Array.from(map.values())
                          })
                        }
                        // 清空 input value，便于再次选同一文件；已选列表由 React state 持有
                        e.target.value = ''
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
                        style={{ background: BLUE }}
                      >
                        <UploadCloud size={15} />
                        选择文件
                      </button>
                      <span className="text-xs text-gray-400 select-none pointer-events-none">
                        {files.length === 0 ? '未选择文件' : `已选 ${files.length} 个文件`}
                      </span>
                    </div>
                    {files.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {files.map((f) => (
                          <li
                            key={`${f.name}-${f.size}-${f.lastModified}`}
                            className="flex items-center justify-between gap-2 text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                          >
                            <span className="text-gray-700 truncate">{f.name}</span>
                            <button
                              type="button"
                              className="shrink-0 text-gray-400 hover:text-red-500 font-medium"
                              onClick={() => setFiles((prev) => prev.filter((x) => !(x.name === f.name && x.size === f.size && x.lastModified === f.lastModified)))}
                            >
                              移除
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Field>
                </div>
              )}

              {sourceMode === 'generate' && (
                <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <Cpu size={18} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-900">根据业务描述生成算法模型</div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        将使用第 1–2 步填写的名称、业务问题与输入输出，调用原平台生成能力产出算法源码，再随本商品一起上架。
                      </p>
                    </div>
                  </div>

                  {!genResult && !generating && (
                    <Btn onClick={() => void runGenerate()}>
                      <Sparkles size={14} /> 开始生成
                    </Btn>
                  )}

                  {generating && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                      <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold mb-3">
                        <Loader2 size={16} className="animate-spin" /> {genMsg || '生成中…'}
                      </div>
                      <ol className="space-y-1.5">
                        {PROGRESS_STEPS.map((s) => (
                          <li key={s.step} className={`text-xs ${s.step <= friendlyStep ? 'text-blue-600' : 'text-gray-400'}`}>
                            {s.step}. {s.title}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {genResult && !generating && (
                    <div className="rounded-xl border border-green-100 bg-green-50/50 p-4 space-y-3">
                      <div className="text-sm font-semibold text-green-700">已生成：{genResult.code_filename}</div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {genResult.model_summary?.purpose || form.tagline || form.problem}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-600">
                        <div className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                          <span className="text-gray-400">输入：</span>
                          {genResult.model_summary?.input_description || form.inputTypes.join(' / ')}
                        </div>
                        <div className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                          <span className="text-gray-400">输出：</span>
                          {genResult.model_summary?.output_description || form.outputTypes.join(' / ')}
                        </div>
                      </div>
                      <Btn size="sm" variant="outline" onClick={() => void runGenerate()}>
                        重新生成
                      </Btn>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: trial */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-black/5 p-6 space-y-4">
              <h2 className="font-bold text-gray-900">配置在线试用</h2>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={allowTrial} onChange={(e) => setAllowTrial(e.target.checked)} />
                允许买家在线试用（保存后可在试用配置页部署或完善）
              </label>
              <p className="text-xs text-gray-400">提交后将创建算法商品；若使用了 AI 生成，源码会登记为可检索的算法模型。</p>
              {publishedId && <p className="text-xs text-green-600">已发布 ID：{publishedId}</p>}
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Btn
              variant="outline"
              disabled={step === 0 || generating}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              上一步
            </Btn>
            <Btn variant="outline" disabled={saving || generating} onClick={() => void saveDraft()}>
              {saving ? '保存中…' : '保存草稿'}
            </Btn>
            {step < STEPS.length - 1 ? (
              <Btn
                disabled={generating}
                onClick={() => {
                  if (!validateStep()) return
                  setStep((s) => s + 1)
                }}
              >
                下一步：{STEPS[step + 1]}
              </Btn>
            ) : (
              <Btn disabled={saving || generating} onClick={() => void submit()}>
                {saving ? '提交中…' : '保存并进入试用配置'}
              </Btn>
            )}
          </div>
        </div>

        {/* 右侧买家预览 — 保留原设计 */}
        <aside className="w-72 shrink-0 hidden xl:block">
          <div className="sticky top-6 bg-white rounded-2xl border border-black/5 p-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-3">
              <Eye size={13} /> 买家商品页预览
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="text-sm font-bold text-gray-800">{previewName}</div>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-4">{previewDesc}</p>
              <div className="mt-3 space-y-1 text-[11px] text-gray-600">
                <div>输入：{form.inputTypes.join(' / ') || '—'}</div>
                <div>输出：{form.outputTypes.join(' / ') || '—'}</div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 py-1.5 text-[10px] font-bold text-white rounded-lg" style={{ background: BLUE }}>
                  试一下
                </button>
                <button className="flex-1 py-1.5 text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-lg">查看详情</button>
              </div>
            </div>
            <p className="text-[10px] text-amber-700 mt-3 leading-relaxed">商品页描述越清晰，买家试用率越高。建议用业务场景举例说明效果。</p>
          </div>
        </aside>
      </div>

      <style>{`
        .input {
          width: 100%;
          margin-top: 0.25rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          outline: none;
          color: #1f2937;
        }
        .input:focus { border-color: #60a5fa; background: #fff; }
      `}</style>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
      {children}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
        active ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-600 border-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function SourceCard({
  active,
  icon: Icon,
  title,
  desc,
  color,
  onClick,
}: {
  active: boolean
  icon: typeof UploadCloud
  title: string
  desc: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition-all ${
        active ? 'border-blue-300 bg-blue-50/40 shadow-sm' : 'border-black/5 bg-white hover:border-gray-200'
      }`}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}18` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="text-sm font-bold text-gray-900">{title}</div>
      <div className="text-[11px] text-gray-500 mt-1">{desc}</div>
    </button>
  )
}
