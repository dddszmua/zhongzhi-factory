import { readClinicalCard } from './clinical'
import type { AlgorithmProduct } from './mappers'

export const departments = [
  { id: 'all', name: '全部科室', aliases: [] },
  { id: 'cardiology', name: '心血管内科', aliases: ['心血管', '心内科'] },
  { id: 'respiratory', name: '呼吸内科', aliases: ['呼吸'] },
  { id: 'gastroenterology', name: '消化内科', aliases: ['消化'] },
  { id: 'endocrinology', name: '内分泌科', aliases: ['内分泌'] },
  { id: 'nephrology', name: '肾内科', aliases: ['肾内', '肾脏'] },
  { id: 'neurology', name: '神经内科', aliases: ['神经内'] },
  { id: 'oncology', name: '肿瘤科', aliases: ['肿瘤'] },
  { id: 'surgery', name: '外科', aliases: ['外科'] },
  { id: 'obstetrics', name: '妇产科', aliases: ['妇科', '产科', '妇产'] },
  { id: 'pediatrics', name: '儿科', aliases: ['儿科', '儿童'] },
  { id: 'emergency', name: '急诊与重症', aliases: ['急诊', '重症', 'ICU'] },
  { id: 'anesthesia', name: '麻醉科', aliases: ['麻醉'] },
  { id: 'general', name: '全科与跨科室', aliases: ['全科', '跨科室', '通用'] },
]

export function matchesDepartment(product: AlgorithmProduct, name: string) {
  if (name === '全部科室' || name === 'all') return true
  const card = readClinicalCard(product.raw)
  const selected = departments.find(d => d.name === name || d.id === name)
  if (card?.departmentIds?.length) return !!selected && card.departmentIds.includes(selected.id)
  const specialty = card?.specialty || ''
  return selected?.aliases.some((alias) => specialty.toLowerCase().includes(alias.toLowerCase())) ?? false
}
