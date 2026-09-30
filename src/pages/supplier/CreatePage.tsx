import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft, Check, Cpu, Eye, Loader2, Sparkles, UploadCloud, X } from 'lucide-react'
import { toast } from 'sonner'
import { previewReference, streamAutoGenerate, uploadScenarioGenerated, type AmlGenerateResult } from '@/api/scenarioDev'
import { useAuth } from '@/auth/AuthContext'
import { Btn } from '@/components/ui/Btn'
import { DOMAIN_OPTIONS, INDUSTRY_OPTIONS, BLUE, GREEN } from '@/lib/constants'
import { mapAgentStepToFriendly, PROGRESS_STEPS } from '@/lib/scenarioConfig'
import { buildCreatePayload } from '@/lib/mappers'
import { createService, getMyAlgorithmModels, setClinicalTrialEnabled, updateService } from '@/api/services'
import { emptyClinicalCard, encodeClinicalCard, type ClinicalCard } from '@/lib/clinical'

const DRAFT_PREFIX = 'ZZF_DRAFT_V1:'

/** 首期 4 步（价格/认证不做）——保持原设计交互 */
const STEPS = ['填写临床信息', '配置输入输出', '上传模型或生成开发模板', '配置在线试用']

const INPUT_OPTIONS = ['结构化临床数据', '医学影像', '病历文本', '心电等时序信号']
const OUTPUT_OPTIONS = ['分析报告', '风险清单', '分类结果', '预测结果', '图表', '结构化 JSON']
const SCENARIO_OPTIONS = ['风险预测', '辅助筛查', '影像分析', '检验分析', '病历信息提取', '随访与预后评估']
const CARD_FIELDS: Array<{ key: keyof ClinicalCard; label: string; hint: string }> = [
  { key: 'population', label: '适用人群与纳入条件', hint: '例如：成年住院患者' },
  { key: 'timepoint', label: '模型使用时点', hint: '例如：入院后 24 小时' },
  { key: 'exclusions', label: '排除与不适用情况', hint: '例如：缺少基线检查者' },
  { key: 'inputs', label: '输入字段及医学含义', hint: '逐项列出输入字段' },
  { key: 'units', label: '计量单位和允许范围', hint: '例如：血压 mmHg，范围 40–260' },
  { key: 'missing', label: '缺失值及错误单位处理', hint: '说明拒绝或插补规则' },
  { key: 'output', label: '输出含义', hint: '例如：未来 30 天事件发生概率' },
  { key: 'horizon', label: '预测时间范围', hint: '例如：出院后 30 天' },
  { key: 'threshold', label: '阈值依据', hint: '如无阈值，请说明' },
  { key: 'dataSource', label: '数据来源概况', hint: '仅写数据摘要，不上传可识别患者资料' },
  { key: 'sampleSize', label: '评估样本量', hint: '若未评估，请写未评估' },
  { key: 'validation', label: '验证方式', hint: '例如：时间外验证；未开展则如实说明' },
  { key: 'results', label: '实际运行结果', hint: '仅填写由真实评估得到的指标' },
  { key: 'version', label: '模型版本', hint: '例如：0.1.0' },
  { key: 'team', label: '开发团队', hint: '团队或机构名称' },
  { key: 'references', label: '参考文献', hint: '文献或研究方案' },
  { key: 'limitations', label: '已知限制', hint: '例如：尚未外部验证' },
  { key: 'intendedUse', label: '允许使用场景', hint: '例如：研究评估，不用于独立诊断' },
]

type SourceMode = 'upload' | 'generate' | null
type ReferencePreviewState = { text?: string; truncated?: boolean; error?: string; loading?: boolean }
const referenceKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`
const CKD_EPI_DEMO_NAME = '2021 CKD-EPI 成人肌酐 eGFR 公式复现'

const CKD_EPI_DEFAULT_CLINICAL_CARD: ClinicalCard = {
  ...emptyClinicalCard,
  specialty: '肾脏病学与检验医学',
  population: '18 岁及以上成年人；',
  timepoint: '获得血清肌酐检验结果后。',
  exclusions: '年龄低于 18 岁、任何输入缺失、血清肌酐单位不是 mg/dL 时不计算；不处理公式性别选项无法确定的情况。',
  inputs: 'age_years：年龄；sex：公式使用的 male 或 female 选项；scr_mg_dl：标准化血清肌酐浓度。',
  units: 'age_years：岁，本演示允许 18–90；scr_mg_dl：mg/dL，本演示允许 0.5–1.5；sex：male 或 female。这里的输入范围只为本次演示设定，不代表公式全部临床适用范围。',
  missing: '不插补；输入缺失、数值越界或肌酐单位不符时拒绝计算。',
  output: 'egfr_ml_min_1_73m2：按 2021 CKD-EPI 肌酐公式估算并取整的 eGFR，单位 mL/min/1.73 m²。',
  horizon: '不适用；这是根据当前检验数据进行的即时估计。',
  threshold: '本演示不设置诊断、分期或用药阈值。',
  dataSource: 'NKF 官方实施说明 PDF 中的公式与测试组合；不使用真实患者数据。',
  sampleSize: '未开展独立临床数据评估。',
  validation: '将平台输出与 NKF 官方 PDF 第 2 页的测试值逐项对照。',
  results: '尚未运行；提交后记录实际对照结果。',
  version: '0.1.0',
  team: '公式复现演示',
  references: 'NKF，Example request to implement the CKD-EPI 2021 equation to calculate eGFR from creatinine，第 1–2 页；原始研究：Inker 等，NEJM 2021。',
  limitations: 'eGFR 是估计值；仅复现肌酐公式并做指定样例核对，未完成独立临床验证。',
  intendedUse: '教学、研发测试和公式实现核对；不作为独立临床决策依据。',
}

function restoreClinicalCard(savedCard: Partial<ClinicalCard> | undefined, isCkdEpiDemo: boolean): ClinicalCard {
  const defaults = isCkdEpiDemo ? CKD_EPI_DEFAULT_CLINICAL_CARD : emptyClinicalCard
  const restored = { ...defaults }
  for (const key of Object.keys(emptyClinicalCard) as Array<keyof ClinicalCard>) {
    const value = savedCard?.[key]
    if (typeof value === 'string' && value.trim()) {
      Object.assign(restored, { [key]: value })
    }
  }
  return restored
}

export function SupplierCreatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const draftId = params.get('draft') || ''
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const [form, setForm] = useState({
    name: CKD_EPI_DEMO_NAME,
    tagline: '根据年龄、性别及标准化血清肌酐，复现 2021 CKD-EPI 成人 eGFR 计算公式。',
    domain: 'health',
    industry: '临床医疗',
    scenario: '检验分析',
    problem: '复现 2021 CKD-EPI 肌酐公式，计算成年人基于血清肌酐的估计肾小球滤过率 eGFR。输入年龄、公式所需性别选项、采用 IDMS 可溯源方法测得的血清肌酐；输出整数 eGFR，单位 mL/min/1.73 m²。',
    suitable: '检验信息系统公式实现验证、医学算法教学，以及使用公开测试组合测试平台在线计算。',
    unsuitable: '不用于未成年人、缺少或单位不明的肌酐结果，也不依据演示结果直接诊断、分期或调整药物剂量。',
    inputTypes: ['结构化临床数据'] as string[],
    outputTypes: ['预测结果'] as string[],
  })
  const [clinicalCard, setClinicalCard] = useState<ClinicalCard>(CKD_EPI_DEFAULT_CLINICAL_CARD)

  const [sourceMode, setSourceMode] = useState<SourceMode>(null)
  const [files, setFiles] = useState<File[]>([])
  const [generationMode, setGenerationMode] = useState<'new_design' | 'reproduce'>('new_design')
  const [reproduceTarget, setReproduceTarget] = useState('公式或评分计算')
  const [mainReferences, setMainReferences] = useState<File[]>([])
  const [referencePreviews, setReferencePreviews] = useState<Record<string, ReferencePreviewState>>({})
  const [reviewedReferences, setReviewedReferences] = useState<string[]>([])
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const mainFileInputRef = useRef<HTMLInputElement>(null)
  const supplementalFileInputRef = useRef<HTMLInputElement>(null)
  const [referenceNotes, setReferenceNotes] = useState('')
  const [referenceUrls, setReferenceUrls] = useState('')
  const [allowTrial, setAllowTrial] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 仅生成能力（不改成想定式整页）
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState('')
  const [friendlyStep, setFriendlyStep] = useState(1)
  const [genResult, setGenResult] = useState<AmlGenerateResult | null>(null)
  const [genSignature, setGenSignature] = useState('')
  const [publishedId, setPublishedId] = useState<string | null>(null)
  const agentTickRef = useRef(0)
  const generationSignature = JSON.stringify({ form, clinicalCard, generationMode, reproduceTarget, mainReferences: mainReferences.map(referenceKey), references: referenceFiles.map(referenceKey), referenceNotes, referenceUrls })

  useEffect(() => {
    if (!draftId || !user?.id) return
    getMyAlgorithmModels(user.id).then((items) => {
      const draft = items.find((item) => item.id === draftId && item.status === 'draft')
      if (!draft) throw new Error('草稿不存在或无权编辑')
      const encoded = draft.source?.companyIntroduce || ''
      if (!encoded.startsWith(DRAFT_PREFIX)) throw new Error('草稿格式无法识别')
      const saved = JSON.parse(encoded.slice(DRAFT_PREFIX.length)) as Partial<typeof form>
      setForm((current) => ({ ...current, tagline: '', problem: '', suitable: '', unsuitable: '', ...saved, name: draft.name }))
      const savedCard = (saved as typeof saved & { clinicalCard?: Partial<ClinicalCard> }).clinicalCard
      setClinicalCard(restoreClinicalCard(savedCard, draft.name === CKD_EPI_DEMO_NAME))
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
      const source = { ...payload.source, companyIntroduce: `${DRAFT_PREFIX}${JSON.stringify({ ...form, clinicalCard })}`, msIntroduce: description }
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

  function addMainReferences(files: File[]) {
    const existing = new Set([...mainReferences, ...referenceFiles].map(referenceKey))
    const added = files.filter((file) => !existing.has(referenceKey(file)))
    if (mainReferences.length + referenceFiles.length + added.length > 5) {
      toast.error('参考资料最多 5 份')
      return
    }
    if (added.some((file) => !/\.(pdf|docx)$/i.test(file.name) || file.size > 10 * 1024 * 1024)) {
      toast.error('主资料仅支持 PDF / DOCX，单份不超过 10 MB')
      return
    }
    setMainReferences((current) => [...current, ...added])
    added.forEach((file) => void previewMainReference(file))
  }

  async function previewMainReference(file: File) {
    const key = referenceKey(file)
    setReferencePreviews((current) => ({ ...current, [key]: { loading: true } }))
    try {
      const preview = await previewReference(file)
      setReferencePreviews((current) => ({ ...current, [key]: { text: preview.text, truncated: preview.truncated } }))
    } catch (cause) {
      const rawMessage = cause instanceof Error ? cause.message : '资料解析失败'
      const message = /not found|\b404\b/i.test(rawMessage)
        ? '资料预览接口未找到：请确认本地 Agent 运行在 8010 端口，并重启前端开发服务'
        : rawMessage
      setReferencePreviews((current) => ({ ...current, [key]: { error: message } }))
      toast.error(message)
    }
  }

  function removeMainReference(file: File) {
    const key = referenceKey(file)
    setMainReferences((current) => current.filter((item) => referenceKey(item) !== key))
    setReviewedReferences((current) => current.filter((item) => item !== key))
    setReferencePreviews((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function openOriginalReference(file: File) {
    const url = URL.createObjectURL(file)
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  function addSupplementalReferences(files: File[]) {
    const existing = new Set([...mainReferences, ...referenceFiles].map(referenceKey))
    const added = files.filter((file) => !existing.has(referenceKey(file)))
    if (mainReferences.length + referenceFiles.length + added.length > 5) {
      toast.error('参考资料最多 5 份')
      return
    }
    if (added.some((file) => file.size > 10 * 1024 * 1024)) {
      toast.error('单份参考资料不能超过 10 MB')
      return
    }
    setReferenceFiles((current) => [...current, ...added])
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
    setGenSignature(generationSignature)
    setGenerating(true)
    setGenResult(null)
    setPublishedId(null)
    setFriendlyStep(1)
    setGenMsg('正在根据业务描述生成算法模型…')
    agentTickRef.current = 0

    const modelName = form.name.trim()

    if (generationMode === 'reproduce' && !mainReferences.length && !referenceFiles.length && !referenceUrls.trim()) {
      setGenerating(false)
      toast.error('复现模式请提供论文、专利或参考网址')
      return
    }
    if (generationMode === 'reproduce' && (reproduceTarget.startsWith('已训练模型推理') || reproduceTarget.startsWith('训练方法与实验'))) {
      setGenerating(false)
      toast.error('当前在线执行器只支持轻量公式与算法步骤；训练模型还需要权重、依赖和数据环境')
      return
    }
    if (generationMode === 'reproduce' && (referenceFiles.length + mainReferences.length > 5 || [...mainReferences, ...referenceFiles].some((file) => file.size > 10 * 1024 * 1024))) {
      setGenerating(false)
      toast.error('参考资料最多 5 份，单份不超过 10 MB')
      return
    }
    if (generationMode === 'reproduce' && mainReferences.some((file) => !referencePreviews[referenceKey(file)]?.text || !reviewedReferences.includes(referenceKey(file)))) {
      setGenerating(false)
      toast.error('请先逐份检查主资料提取结果，并确认关键公式、参数所在位置')
      return
    }
    if (generationMode === 'reproduce' && mainReferences.some((file) => referencePreviews[referenceKey(file)]?.truncated) && !referenceNotes.trim()) {
      setGenerating(false)
      toast.error('资料较长，请在说明中写出关键页码和公式内容')
      return
    }

    const narrative = [form.tagline.trim(), form.problem.trim(), form.suitable.trim(), `复现范围：${generationMode === 'reproduce' ? reproduceTarget : '按临床问题开发'}`, `目标患者：${clinicalCard.population}`, `排除条件：${clinicalCard.exclusions}`, `使用时点：${clinicalCard.timepoint}`, `当时可用数据：${clinicalCard.inputs}`, `输出：${clinicalCard.output}`, `预测时间范围：${clinicalCard.horizon}`, `允许用途：${clinicalCard.intendedUse}`, `已知限制：${clinicalCard.limitations}`]
      .filter(Boolean)
      .join('\n')

    const fd = new FormData()
    fd.append('model_name', modelName)
    fd.append('free_narrative', narrative)
    fd.append('domain', 'clinical')
    fd.append('clinical_task', form.scenario)
    fd.append('generation_mode', generationMode)
    if (generationMode === 'reproduce' && mainReferences[0]) fd.append('file', mainReferences[0]);
    if (generationMode === 'reproduce') [...mainReferences.slice(1), ...referenceFiles].forEach((file) => fd.append('reference_files', file))
    const urls = generationMode === 'reproduce' ? referenceUrls.split(/\r?\n/).map((url) => url.trim()).filter(Boolean) : []
    fd.append('reference_urls', JSON.stringify(urls))
    fd.append('reference_notes', generationMode === 'reproduce' ? referenceNotes.trim() : '')
    fd.append('industry', form.industry)
    fd.append('scenario', form.scenario)
    fd.append('technology', 'AI')
    fd.append('algorithm_category', reproduceTarget === '公式或评分计算' ? 'regression' : 'classification')
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
    if (sourceMode === 'generate' && generationSignature !== genSignature) {
      toast.error('生成依据已改变，请重新生成后再保存')
      setStep(2)
      return
    }
    if (!clinicalCard.population.trim() || !clinicalCard.inputs.trim() || !clinicalCard.output.trim() || !clinicalCard.intendedUse.trim()) {
      toast.error('请完善说明卡中的适用人群、输入、输出和允许使用场景')
      setStep(0)
      return
    }

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
        if (draftId) fd.append('draft_id', draftId);
        if (generationMode === 'reproduce') [...mainReferences, ...referenceFiles].forEach((file) => fd.append('reference_files', file))
        if (genResult.algorithm_spec?.inputs?.length && genResult.smoke_input) {
          fd.append('algorithm_spec', JSON.stringify(genResult.algorithm_spec))
          fd.append('smoke_input', JSON.stringify(genResult.smoke_input))
        }
        fd.append(
          'source',
          JSON.stringify({
            popoverTitle: name,
            companyName: '众智工场供应商',
            msIntroduce: description,
            companyIntroduce: encodeClinicalCard({ ...clinicalCard, task: form.scenario, specialty: clinicalCard.specialty }),
            generationEvidence: [
              `生成方式：${generationMode === 'reproduce' ? `依据资料复现 / ${reproduceTarget}` : '按需求开发'}`,
              `资料：${generationMode === 'reproduce' ? ([...mainReferences.map((file) => file.name), ...referenceFiles.map((file) => file.name), referenceUrls.trim()].filter(Boolean).join('；') || '未提供') : '未提供'}`,
            ],
            reproductionMode: generationMode === 'reproduce',
          }),
        )
        const res = await uploadScenarioGenerated(fd)
        setPublishedId(res?.service?.id || null)
        if (res?.service?.id && res.service.algorithmArtifact?.status === 'ready' && allowTrial) {
          try { await setClinicalTrialEnabled(res.service.id, allowTrial) } catch { toast.message('试用权限保存失败，请在工作台重新配置') }
        }
        toast.success(res?.service?.algorithmArtifact?.status === 'ready' ? '模型已保存并通过样例运行，可在工作台试用' : '模型已保存，运行规范待配置或样例未通过')
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
        if (res?.service?.id) {
          await updateService(res.service.id, {
            domain: 'health', industry: '临床医疗', scenario: form.scenario,
            source: {
              companyName: '临床模型研发团队',
              msIntroduce: description,
              companyIntroduce: encodeClinicalCard({ ...clinicalCard, task: form.scenario, specialty: clinicalCard.specialty }),
            },
          })
        }
        setPublishedId(res?.service?.id || null)
        toast.success('模型及配套文件已提交，完成临床目录审核后公开展示')
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
        <h1 className="text-2xl font-extrabold text-gray-900">{draftId ? '继续编辑模型草稿' : '提交临床模型'}</h1>
        <p className="text-sm text-gray-500 mt-1">
          说明适用人群、输入输出、验证证据和使用限制。未审核模型不会进入公开目录。
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
                      placeholder="例如：成年住院患者 30 天再入院风险预测"
                    />
                  </Field>
                  <Field label="一句话说明" required>
                    <input
                      className="input"
                      value={form.tagline}
                      onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                      placeholder="例如：使用入院时可得数据预测 30 天内再入院风险。"
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
                  临床问题描述
                </h2>
                <Field label="这个模型解决什么临床问题？">
                  <textarea
                    className="input"
                    rows={5}
                    value={form.problem}
                    onChange={(e) => setForm({ ...form, problem: e.target.value })}
                    placeholder="请描述目标患者、使用时点、可用数据、预测结局和研究目的。"
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <Field label="适用场景说明">
                    <textarea className="input" rows={3} value={form.suitable} onChange={(e) => setForm({ ...form, suitable: e.target.value })} placeholder="适合哪些临床或研究场景" />
                  </Field>
                  <Field label="不适用场景">
                    <textarea className="input" rows={3} value={form.unsuitable} onChange={(e) => setForm({ ...form, unsuitable: e.target.value })} placeholder="请明确不适用人群及使用限制" />
                  </Field>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-black/5 p-6">
                <h2 className="font-bold text-gray-900 mb-2">临床模型说明卡</h2>
                <p className="text-xs text-gray-500 mb-4">性能指标只能填写实际评估结果。没有训练数据时，生成的是开发模板。</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="专科场景"><input className="input" value={clinicalCard.specialty} onChange={(e) => setClinicalCard({ ...clinicalCard, specialty: e.target.value })} placeholder="例如：心血管、呼吸、肿瘤、重症" /></Field>
                  {CARD_FIELDS.map(({ key, label, hint }) => <Field key={key} label={label}>
                    <textarea className="input" rows={2} value={clinicalCard[key]} onChange={(e) => setClinicalCard({ ...clinicalCard, [key]: e.target.value })} placeholder={hint} />
                  </Field>)}
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
                            className="relative text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 pr-10"
                          >
                            <span className="block text-gray-700 break-all">{f.name}</span>
                            <button
                              type="button"
                              aria-label={`移除 ${f.name}`}
                              title="移除文件"
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                              onClick={() => setFiles((prev) => prev.filter((x) => !(x.name === f.name && x.size === f.size && x.lastModified === f.lastModified)))}
                            >
                              <X size={16} />
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
                  <div className="space-y-3 border-b pb-4">
                    <h3 className="font-semibold text-sm">生成依据与目标</h3>
                    <div className="flex gap-4 text-sm"><label><input type="radio" checked={generationMode === 'new_design'} onChange={() => { setGenerationMode('new_design'); setGenResult(null) }} /> 按临床需求开发</label><label><input type="radio" checked={generationMode === 'reproduce'} onChange={() => { setGenerationMode('reproduce'); setGenResult(null) }} /> 依据论文或专利复现</label></div>
                    {generationMode === 'reproduce' && <>
                      <label className="block text-sm">复现范围<select value={reproduceTarget} onChange={(e) => setReproduceTarget(e.target.value)} className="input mt-1"><option>公式或评分计算</option><option>算法步骤</option><option disabled>已训练模型推理（待支持）</option><option disabled>训练方法与实验（待支持）</option></select></label>
                      <div className="space-y-2 text-sm">
                        <p className="font-medium">主论文或专利（PDF / DOCX，可多选，首份作为主资料）</p>
                        <input ref={mainFileInputRef} type="file" multiple accept=".pdf,.docx" className="sr-only" onChange={(event) => { addMainReferences(Array.from(event.target.files || [])); event.target.value = '' }} />
                        <button type="button" onClick={() => mainFileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white font-semibold"><UploadCloud size={15} />选择文件</button>
                        {mainReferences.map((file) => {
                          const key = referenceKey(file)
                          const preview = referencePreviews[key]
                          return <div key={key} className="relative rounded-xl border bg-white p-3 pr-10 space-y-2">
                            <button type="button" aria-label={`移除 ${file.name}`} title="移除文件" onClick={() => removeMainReference(file)} className="absolute right-2 top-2 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600"><X size={16} /></button>
                            <p className="break-all font-medium">{file.name}</p>
                            {file.name.toLowerCase().endsWith('.pdf') && <button type="button" onClick={() => openOriginalReference(file)} className="text-xs text-blue-600 underline">查看 PDF 原页</button>}
                            {preview?.loading && <p className="text-xs text-gray-500">正在提取文档文字…</p>}
                            {preview?.error && <div className="text-xs text-red-600"><p>{preview.error}</p><button type="button" onClick={() => void previewMainReference(file)} className="mt-1 text-blue-600 underline">重试解析</button></div>}
                            {preview?.text && <><p className="text-xs text-amber-700">公式上标、分式和表格排版请以 PDF 原页为准。</p><pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">{preview.text}</pre><label className="flex gap-2 text-xs"><input type="checkbox" checked={reviewedReferences.includes(key)} onChange={(event) => setReviewedReferences((current) => event.target.checked ? [...current, key] : current.filter((item) => item !== key))} />我已对照原页核对这份资料中的关键公式、参数和页码</label></>}
                            {preview?.truncated && <p className="text-xs text-amber-700">文档超过可处理长度，请在下方说明中写明关键页码、公式与参数。</p>}
                          </div>
                        })}
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="font-medium">补充资料（PDF、文本、代码或 ZIP）</p>
                        <input ref={supplementalFileInputRef} type="file" multiple accept=".pdf,.docx,.txt,.md,.py,.ipynb,.json,.csv,.zip" className="sr-only" onChange={(event) => { addSupplementalReferences(Array.from(event.target.files || [])); event.target.value = '' }} />
                        <button type="button" onClick={() => supplementalFileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold"><UploadCloud size={15} />选择文件</button>
                        {referenceFiles.map((file) => <div key={referenceKey(file)} className="relative rounded-xl border bg-white p-3 pr-10"><span className="break-all">{file.name}</span><button type="button" aria-label={`移除 ${file.name}`} title="移除文件" onClick={() => setReferenceFiles((current) => current.filter((item) => referenceKey(item) !== referenceKey(file)))} className="absolute right-2 top-2 rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-red-600"><X size={16} /></button></div>)}
                      </div>
                      <label className="block text-sm">参考网址（每行一个）<textarea value={referenceUrls} onChange={(e) => setReferenceUrls(e.target.value)} rows={2} className="input mt-1" placeholder="论文或专利的公开网址" /></label>
                      <label className="block text-sm">重点页码、公式号、实施例及参数说明<textarea value={referenceNotes} onChange={(e) => setReferenceNotes(e.target.value)} rows={3} className="input mt-1" placeholder="例如：第 4 页公式 (3)，表 2 的固定参数；请严格按原文实现" /></label>
                      <p className="text-xs text-amber-700">请核对提取后的公式、单位与参数。缺少训练数据或模型权重时，生成结果可能只是待配置的开发工程。</p>
                    </>}
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      <Cpu size={18} className="text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-900">根据临床问题生成模型开发模板</div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        仅发送临床问题、字段结构与数据摘要给生成助手。未提供训练数据时交付开发模板；生成内容不代表已训练或已验证。
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
                      <p className="text-xs text-gray-700">运行规范：{genResult.algorithm_spec?.inputs?.length && genResult.smoke_input ? `已提供 ${genResult.algorithm_spec.inputs.length} 个输入字段和样例；保存时将执行真实样例验证` : '未提供完整运行规范；保存后暂不能在线试用'}</p>
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
              <h2 className="font-bold text-gray-900">配置合成数据试用</h2>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={allowTrial} onChange={(e) => setAllowTrial(e.target.checked)} />
                样例验证通过且目录审核后，允许其他登录用户在线试用
              </label>
              <p className="text-xs text-gray-400">提交后模型进入待审核状态。性能指标只能来自实际数据评估。</p>
              {publishedId && <p className="text-xs text-green-600">已提交 ID：{publishedId}</p>}
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
