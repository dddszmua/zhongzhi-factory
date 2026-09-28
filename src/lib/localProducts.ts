import { ALGORITHM_MODEL_TYPE, type BackendService } from './mappers'

const LOCAL_PRODUCTS_KEY = 'zzf_local_algorithm_products'

export type LocalAlgorithmDraft = {
  id: string
  name: string
  des?: string
  domain?: string
  industry?: string
  scenario?: string
  technology?: string
  creatorId: string
  createTime: number
  status?: string
}

function readAll(): LocalAlgorithmDraft[] {
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LocalAlgorithmDraft[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(list: LocalAlgorithmDraft[]) {
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(list))
}

/** 演示兜底：上传失败时本地缓存一条算法模型，便于列表可见 */
export function saveLocalAlgorithmProduct(draft: Omit<LocalAlgorithmDraft, 'id' | 'createTime'> & { id?: string }) {
  const list = readAll()
  const item: LocalAlgorithmDraft = {
    id: draft.id || `local-${Date.now()}`,
    name: draft.name,
    des: draft.des,
    domain: draft.domain,
    industry: draft.industry,
    scenario: draft.scenario,
    technology: draft.technology || 'AI',
    creatorId: draft.creatorId,
    createTime: Date.now(),
    status: draft.status || 'default',
  }
  const next = [item, ...list.filter((x) => x.id !== item.id)]
  writeAll(next.slice(0, 50))
  return item
}

export function getLocalAlgorithmProducts(userId: string): BackendService[] {
  if (!userId) return []
  return readAll()
    .filter((x) => x.creatorId === userId)
    .map(
      (x): BackendService => ({
        id: x.id,
        name: x.name,
        type: ALGORITHM_MODEL_TYPE,
        domain: x.domain,
        industry: x.industry,
        scenario: x.scenario,
        technology: x.technology,
        status: x.status || 'default',
        createTime: x.createTime,
        creatorId: x.creatorId,
        des: x.des,
        source: {
          popoverTitle: x.name,
          msIntroduce: x.des,
          companyName: '众智工场供应商',
        },
      }),
    )
}

/** 远程列表优先；本地项仅补齐远程没有的 id */
export function mergeLocalAlgorithmProducts(remote: BackendService[], userId: string): BackendService[] {
  const local = getLocalAlgorithmProducts(userId)
  if (!local.length) return remote
  const ids = new Set(remote.map((s) => s.id))
  return [...remote, ...local.filter((s) => !ids.has(s.id))]
}
