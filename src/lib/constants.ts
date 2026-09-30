export const BLUE = '#1E5EFF'
export const PURPLE = '#7B61FF'
export const GREEN = '#22A06B'
export const AMBER = '#F59E0B'

export const ACCESS_TOKEN_KEY = 'Access-Token'
export const USERNAME_KEY = 'zzf_username'

/** 后端 domain → 业务友好标签 */
export const DOMAIN_LABELS: Record<string, string> = {
  aml: '金融风控',
  health: '临床医疗',
  ecommerce: '电商运营',
  agriculture: '智慧农业',
  aircraft: '航空装备',
  evtol: '低空出行',
  homeAI: '家庭智能',
  generic: '通用场景',
}

export const INDUSTRY_OPTIONS = [
  { value: '临床医疗', label: '临床医疗' },
]

export const DOMAIN_OPTIONS = [
  { value: 'health', label: '临床医疗' },
]

export function domainLabel(domain?: string) {
  if (!domain) return '通用场景'
  return DOMAIN_LABELS[domain] || domain
}
