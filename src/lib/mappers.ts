import { domainLabel } from './constants'

/** 后端 Service 原始结构（列表/详情子集） */
export interface BackendService {
  id: string
  name: string
  attribute?: string
  type?: string
  domain?: string
  industry?: string
  scenario?: string
  technology?: string
  status?: string
  number?: number
  createTime?: number
  creatorId?: string
  des?: string
  url?: string
  method?: string
  exampleMsg?: unknown
  tools?: Array<{ name?: string; description?: string }>
  apiList?: Array<{
    name?: string
    url?: string
    des?: string
    method?: string
    inputName?: string
    outputName?: string
    exampleMsg?: unknown
  }>
  source?: {
    msIntroduce?: string
    companyIntroduce?: string
    companyName?: string
    popoverTitle?: string
  }
  norm?: Array<{ key?: string; score?: number }>
}

/**
 * 旧平台 services.type：
 * - generated_algorithm → 算法模型（众智工场市场只展示这类）
 * - atomic / atomic_mcp → 微服务（市场排除）
 * - meta → 元应用（市场排除）
 */
export const ALGORITHM_MODEL_TYPE = 'generated_algorithm'

export function isAlgorithmModel(svc: Pick<BackendService, 'type'> | null | undefined): boolean {
  return (svc?.type || '') === ALGORITHM_MODEL_TYPE
}

export function onlyAlgorithmModels(list: BackendService[] | undefined | null): BackendService[] {
  if (!Array.isArray(list)) return []
  return list.filter(isAlgorithmModel)
}

export type ProductStatus = 'listed' | 'draft' | 'trialable' | 'error' | 'other'

export interface AlgorithmProduct {
  id: string
  name: string
  description: string
  domain: string
  domainLabel: string
  industry: string
  scenario: string
  technology: string
  status: string
  statusLabel: string
  productStatus: ProductStatus
  trialCount: number
  inputType: string
  outputType: string
  tags: string[]
  badges: Array<{ label: string; color: 'blue' | 'purple' | 'green' | 'orange' | 'gray' | 'amber' | 'red' }>
  trialable: boolean
  createTime?: number
  creatorId?: string
  endpoint?: string
  method?: string
  exampleMsg?: unknown
  raw: BackendService
}

const DEPLOYED = new Set(['deployed', 'running', 'online', 'active'])
const DRAFT = new Set(['default', 'not_deployed', 'draft', 'pre_release_unrated', ''])

function statusLabel(status?: string): string {
  const s = (status || '').toLowerCase()
  if (DEPLOYED.has(s)) return '已上架'
  if (s === 'deploying') return '部署中'
  if (s === 'error') return '异常'
  if (s === 'pre_release_unrated') return '草稿'
  if (DRAFT.has(s)) return '草稿'
  return status || '未知'
}

function productStatus(status?: string): ProductStatus {
  const s = (status || '').toLowerCase()
  if (DEPLOYED.has(s)) return 'listed'
  if (s === 'error') return 'error'
  if (DRAFT.has(s) || s === 'pre_release_unrated') return 'draft'
  if (s === 'deploying') return 'other'
  return 'other'
}

function pickDescription(svc: BackendService): string {
  if (svc.des?.trim()) return svc.des.trim()
  if (svc.source?.msIntroduce?.trim()) return svc.source.msIntroduce.trim()
  if (svc.source?.companyIntroduce?.trim()) return svc.source.companyIntroduce.trim()
  if (svc.apiList?.[0]?.des?.trim()) return svc.apiList[0].des!.trim()
  return '暂无业务描述，请查看详情了解输入输出与适用场景。'
}

function inferIO(svc: BackendService): { input: string; output: string } {
  const api = svc.apiList?.[0]
  const input = api?.inputName || (svc.type?.includes('mcp') ? '结构化请求 / 文件' : '业务数据')
  const output = api?.outputName || (svc.tools?.length ? '分析结果' : '模型输出')
  return { input, output }
}

export function mapServiceToProduct(svc: BackendService): AlgorithmProduct {
  const { input, output } = inferIO(svc)
  const dLabel = domainLabel(svc.domain)
  const st = statusLabel(svc.status)
  const ps = productStatus(svc.status)
  const trialable = DEPLOYED.has((svc.status || '').toLowerCase()) || Boolean(svc.url || svc.apiList?.[0]?.url)
  const badges: AlgorithmProduct['badges'] = []

  if (trialable) badges.push({ label: '可试用', color: 'blue' })
  if (ps === 'listed') badges.push({ label: '已上架', color: 'green' })
  if (ps === 'draft') badges.push({ label: '草稿', color: 'amber' })
  if (svc.type === 'atomic_mcp') badges.push({ label: '在线服务', color: 'purple' })

  const tags = [dLabel, svc.industry, svc.scenario].filter(Boolean) as string[]

  return {
    id: svc.id,
    name: svc.name || '未命名算法',
    description: pickDescription(svc),
    domain: svc.domain || 'generic',
    domainLabel: dLabel,
    industry: svc.industry || '',
    scenario: svc.scenario || '',
    technology: svc.technology || '',
    status: svc.status || '',
    statusLabel: st,
    productStatus: ps,
    trialCount: svc.number || 0,
    inputType: input,
    outputType: output,
    tags: [...new Set(tags)],
    badges,
    trialable,
    createTime: svc.createTime,
    creatorId: svc.creatorId,
    endpoint: svc.url || svc.apiList?.[0]?.url || '',
    method: svc.method || svc.apiList?.[0]?.method || 'POST',
    exampleMsg: svc.exampleMsg ?? svc.apiList?.[0]?.exampleMsg,
    raw: svc,
  }
}

export function mapServices(list: BackendService[] | undefined | null): AlgorithmProduct[] {
  if (!Array.isArray(list)) return []
  return list.map(mapServiceToProduct)
}

/** 市场用：先筛算法模型再映射为商品卡片 */
export function mapAlgorithmModels(list: BackendService[] | undefined | null): AlgorithmProduct[] {
  return mapServices(onlyAlgorithmModels(list))
}

/** 将业务表单映射为后端 create payload */
export function buildCreatePayload(form: {
  name: string
  description: string
  domain: string
  industry: string
  scenario: string
  inputType: string
  outputType: string
  companyName?: string
}) {
  return {
    name: form.name,
    attribute: 'custom',
    type: ALGORITHM_MODEL_TYPE,
    domain: form.domain || 'generic',
    industry: form.industry || '',
    scenario: form.scenario || '',
    technology: 'AI',
    network: 'bridge',
    port: '',
    volume: '',
    status: 'not_deployed',
    number: 0,
    source: {
      popoverTitle: form.name,
      companyName: form.companyName || '众智工场供应商',
      companyAddress: '',
      companyContact: '',
      companyIntroduce: form.description,
      msIntroduce: form.description,
      companyScore: 0,
      msScore: 0,
    },
    apiList: [
      {
        name: form.name,
        url: '',
        method: 'POST',
        des: form.description,
        inputName: form.inputType || '业务数据',
        outputName: form.outputType || '分析结果',
        isFake: 0,
      },
    ],
  }
}

export function completenessOf(product: AlgorithmProduct) {
  const checks = [
    { key: 'basic', label: '基础信息已填写', done: Boolean(product.name && product.description) },
    { key: 'io', label: '输入输出已配置', done: Boolean(product.inputType && product.outputType) },
    { key: 'trial', label: '在线试用已开启', done: product.trialable || product.productStatus === 'listed' },
  ]
  const doneCount = checks.filter((c) => c.done).length
  return { checks, doneCount, total: checks.length, percent: Math.round((doneCount / checks.length) * 100) }
}
