import { apiClient } from './client'

export type ClinicalPaper = {
  id: string; modelName: string; doi: string; year: number; departmentIds: string[];
  sourceUrl: string; pdfUrl: string; version: string; readiness: string;
  canCreate: boolean; scope: string; accessNote: string; license: string;
}
export function getClinicalCatalog(): Promise<{ departments: Array<{id: string; name: string}>; papers: ClinicalPaper[] }> {
  return apiClient.get('/clinical-creation/catalog') as unknown as Promise<{ departments: Array<{id: string; name: string}>; papers: ClinicalPaper[] }>
}
