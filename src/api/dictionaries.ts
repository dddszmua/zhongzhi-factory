import { apiClient } from './client'

export type DictItem = { code: string; text: string; sort?: number }

export async function getDictionaryByCategory(category: string): Promise<DictItem[]> {
  try {
    const res = await apiClient.get<{ dictionaries?: DictItem[]; data?: DictItem[] }, { dictionaries?: DictItem[]; data?: DictItem[] }>(`/dictionaries/${category}`)
    const list = res?.dictionaries || res?.data || (Array.isArray(res) ? res : [])
    if (!Array.isArray(list)) return []
    return list
      .map((d: { code?: string; text?: string; sort?: number }) => ({
        code: String(d.code || ''),
        text: String(d.text || d.code || ''),
        sort: d.sort,
      }))
      .filter((d: DictItem) => d.code)
      .sort((a: DictItem, b: DictItem) => (a.sort || 0) - (b.sort || 0))
  } catch {
    return []
  }
}
