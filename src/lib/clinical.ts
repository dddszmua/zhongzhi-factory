import type { BackendService } from './mappers'

export const CLINICAL_PREFIX = 'ZZF_CLINICAL_V1:'

export interface ClinicalCard {
  task: string
  specialty: string
  population: string
  timepoint: string
  exclusions: string
  inputs: string
  units: string
  missing: string
  output: string
  horizon: string
  threshold: string
  dataSource: string
  sampleSize: string
  validation: string
  results: string
  version: string
  team: string
  references: string
  limitations: string
  intendedUse: string
  reviewStatus: 'pending' | 'approved' | 'rejected'
}

export const emptyClinicalCard: ClinicalCard = {
  task: '', specialty: '', population: '', timepoint: '', exclusions: '', inputs: '', units: '', missing: '',
  output: '', horizon: '', threshold: '', dataSource: '', sampleSize: '', validation: '',
  results: '', version: '', team: '', references: '', limitations: '', intendedUse: '', reviewStatus: 'pending',
}

export function readClinicalCard(service: BackendService): ClinicalCard | null {
  const raw = service.source?.companyIntroduce || ''
  if (!raw.startsWith(CLINICAL_PREFIX)) return null
  try {
    const parsed = JSON.parse(raw.slice(CLINICAL_PREFIX.length)) as Partial<ClinicalCard>
    return { ...emptyClinicalCard, ...parsed }
  } catch {
    return null
  }
}

export function encodeClinicalCard(card: ClinicalCard): string {
  // Publishing always submits for review. The client must never grant approval.
  return CLINICAL_PREFIX + JSON.stringify({ ...card, reviewStatus: 'pending' })
}

export function isClinicalDomain(service: BackendService): boolean {
  return service.domain === 'health'
}

export function isClinicalListed(service: BackendService): boolean {
  const card = readClinicalCard(service)
  return isClinicalDomain(service) && card?.reviewStatus === 'approved' &&
    Boolean(card.population && card.inputs && card.output && card.intendedUse) &&
    service.status !== 'draft'
}

export function onlyClinicalListed(list: BackendService[]): BackendService[] {
  return list.filter(isClinicalListed)
}
