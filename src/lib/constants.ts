export const BLUE = '#1E5EFF'
export const PURPLE = '#7B61FF'
export const GREEN = '#22A06B'
export const AMBER = '#F59E0B'

export const ACCESS_TOKEN_KEY = 'Access-Token'
export const USERNAME_KEY = 'zzf_username'

/** 后端 domain → 业务友好标签 */
export const DOMAIN_LABELS: Record<string, string> = {
  aml: '金融风控',
  health: '医疗科研',
  ecommerce: '电商运营',
  agriculture: '智慧农业',
  aircraft: '航空装备',
  evtol: '低空出行',
  homeAI: '家庭智能',
  generic: '通用场景',
}

export const INDUSTRY_OPTIONS = [
  { value: '金融风控', label: '金融风控' },
  { value: '工业质检', label: '工业质检' },
  { value: '电商运营', label: '电商运营' },
  { value: '文档审核', label: '文档审核' },
  { value: '高校科研', label: '高校科研' },
  { value: '医疗科研', label: '医疗科研' },
  { value: '其他', label: '其他' },
]

export const DOMAIN_OPTIONS = [
  { value: 'aml', label: '金融风控' },
  { value: 'health', label: '医疗科研' },
  { value: 'ecommerce', label: '电商运营' },
  { value: 'agriculture', label: '智慧农业' },
  { value: 'aircraft', label: '航空装备' },
  { value: 'evtol', label: '低空出行' },
  { value: 'homeAI', label: '家庭智能' },
  { value: 'generic', label: '通用场景' },
]

export function domainLabel(domain?: string) {
  if (!domain) return '通用场景'
  return DOMAIN_LABELS[domain] || domain
}
