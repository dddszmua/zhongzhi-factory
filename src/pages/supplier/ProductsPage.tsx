import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, PlusCircle } from 'lucide-react'
import { getMyAlgorithmModels } from '@/api/services'
import { useAuth } from '@/auth/AuthContext'
import { completenessOf, mapServices, type AlgorithmProduct } from '@/lib/mappers'
import { mergeLocalAlgorithmProducts } from '@/lib/localProducts'
import { Badge } from '@/components/ui/Badge'
import { Btn } from '@/components/ui/Btn'
import { BLUE } from '@/lib/constants'

type FilterKey = 'all' | 'listed' | 'draft' | 'trialable'

export function SupplierProductsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [products, setProducts] = useState<AlgorithmProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user?.id) {
        if (!cancelled) {
          setProducts([])
          setLoading(false)
        }
        return
      }
      try {
        const list = await getMyAlgorithmModels(user.id, user.username)
        const merged = mergeLocalAlgorithmProducts(list, user.id)
        if (!cancelled) setProducts(mapServices(merged))
      } catch {
        if (!cancelled) {
          const localOnly = mergeLocalAlgorithmProducts([], user.id)
          setProducts(mapServices(localOnly))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.username])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filter === 'listed' && p.productStatus !== 'listed') return false
      if (filter === 'draft' && p.productStatus !== 'draft') return false
      if (filter === 'trialable' && !p.trialable) return false
      if (keyword.trim()) {
        const q = keyword.trim().toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [products, filter, keyword])

  const completeness = filtered[0] ? completenessOf(filtered[0]) : null

  const chips: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'listed', label: '已上架' },
    { key: 'draft', label: '草稿' },
    { key: 'trialable', label: '可试用' },
  ]

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">我的算法商品</h1>
          <p className="text-sm text-gray-500 mt-1">管理已创建、已上架和待配置的算法商品。</p>
        </div>
        <Btn onClick={() => navigate('/supplier/create')}>
          <PlusCircle size={14} /> 发布新算法
        </Btn>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 p-4 mb-6">
        <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl">
          <Search size={16} className="text-gray-400" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索算法名称、业务问题、输入类型或行业场景"
            className="flex-1 text-sm outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border ${
                filter === c.key ? 'bg-blue-50 text-blue-600 border-blue-200' : 'text-gray-600 border-gray-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          {loading ? (
            <div className="text-sm text-gray-400 py-12 text-center">加载中…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-gray-400 py-12 text-center bg-white rounded-2xl border border-black/5">
              暂无商品，点击「发布新算法」开始创建
            </div>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-black/5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>
                  </div>
                  <Badge color={p.productStatus === 'listed' ? 'green' : 'amber'}>{p.statusLabel}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.tags.map((t) => (
                    <Badge key={t} color="gray">
                      {t}
                    </Badge>
                  ))}
                  {p.trialable && <Badge color="blue">可试用</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-500">
                  <div>输入：{p.inputType}</div>
                  <div>输出：{p.outputType}</div>
                  <div>调用：{p.trialCount}</div>
                  <div>场景：{p.domainLabel}</div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg"
                    style={{ background: BLUE }}
                    onClick={() => navigate(`/products/${p.id}`)}
                  >
                    查看商品页
                  </button>
                  <button
                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg"
                    onClick={() => navigate(`/supplier/trial?id=${p.id}`)}
                  >
                    配置试用
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <aside>
          <div className="bg-white rounded-2xl border border-black/5 p-5 sticky top-6">
            <h3 className="font-bold text-gray-900 text-sm mb-1">商品完整度</h3>
            <p className="text-xs text-gray-400 mb-4">基于当前列表首个商品示意（价格/认证项首期不展示）</p>
            {completeness ? (
              <>
                <div className="text-2xl font-extrabold text-gray-900 mb-3">{completeness.percent}%</div>
                <ul className="space-y-2">
                  {completeness.checks.map((c) => (
                    <li key={c.key} className="flex items-center gap-2 text-xs">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] ${c.done ? 'bg-green-500' : 'bg-gray-300'}`}>
                        {c.done ? '✓' : ''}
                      </span>
                      <span className={c.done ? 'text-gray-700' : 'text-gray-400'}>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="text-xs text-gray-400">创建商品后可查看完整度</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
