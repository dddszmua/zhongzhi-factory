import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Search } from 'lucide-react'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import { ProductCard } from '@/components/product/ProductCard'
import { filterAlgorithmModels, searchAlgorithmModels, smartSearchAlgorithmModels } from '@/api/services'
import { mapAlgorithmModels, type AlgorithmProduct } from '@/lib/mappers'
import { DOMAIN_OPTIONS, BLUE } from '@/lib/constants'

export function MarketPage() {
  const [params, setParams] = useSearchParams()
  const initialQ = params.get('q') || ''
  const [keyword, setKeyword] = useState(initialQ)
  const [domain, setDomain] = useState(params.get('domain') || '')
  const [products, setProducts] = useState<AlgorithmProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(q = keyword, d = domain) {
    setLoading(true)
    setError('')
    try {
      let list
      if (q.trim()) {
        try {
          list = await smartSearchAlgorithmModels({
            requirement: q.trim(),
            description: q.trim(),
            domain: d || 'generic',
          })
          if (!list.length) list = await searchAlgorithmModels(q.trim())
        } catch {
          list = await searchAlgorithmModels(q.trim())
        }
      } else {
        list = await filterAlgorithmModels(d ? { domain: d } : {})
      }
      if (d && list.length) {
        list = list.filter((s) => !d || s.domain === d)
      }
      setProducts(mapAlgorithmModels(list))
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(initialQ, domain)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const chips = useMemo(
    () => [{ value: '', label: '全部' }, ...DOMAIN_OPTIONS.map((o) => ({ value: o.value, label: o.label }))],
    [],
  )

  function applySearch() {
    const next = new URLSearchParams()
    if (keyword.trim()) next.set('q', keyword.trim())
    if (domain) next.set('domain', domain)
    setParams(next)
    void load(keyword, domain)
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc]" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <NavBar />
      <main className="pt-24 pb-16">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">AI 算法市场</h1>
            <p className="text-sm text-gray-500 mt-2">浏览、筛选并试用平台上的算法商品。</p>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 p-4 mb-6 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl">
                <Search size={16} className="text-gray-400" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                  placeholder="搜索算法名称、业务问题或场景"
                  className="flex-1 text-sm outline-none"
                />
              </div>
              <button
                onClick={applySearch}
                className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl"
                style={{ background: BLUE }}
              >
                搜索
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {chips.map((c) => (
                <button
                  key={c.label}
                  onClick={() => {
                    setDomain(c.value)
                    const next = new URLSearchParams()
                    if (keyword.trim()) next.set('q', keyword.trim())
                    if (c.value) next.set('domain', c.value)
                    setParams(next)
                    void load(keyword, c.value)
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    domain === c.value
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center text-sm text-gray-400 py-20">加载中…</div>
          ) : error ? (
            <div className="text-center text-sm text-red-500 py-20">{error}</div>
          ) : products.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-20">没有找到匹配的算法商品</div>
          ) : (
            <>
              <div className="text-xs text-gray-400 mb-4">共 {products.length} 个结果</div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
