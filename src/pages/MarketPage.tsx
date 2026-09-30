import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Search } from 'lucide-react'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import { ProductCard } from '@/components/product/ProductCard'
import { filterAlgorithmModels, searchAlgorithmModels, smartSearchAlgorithmModels } from '@/api/services'
import { mapAlgorithmModels, type AlgorithmProduct } from '@/lib/mappers'
import { BLUE } from '@/lib/constants'
import { readClinicalCard } from '@/lib/clinical'

const TASKS = ['全部任务', '风险预测', '辅助筛查', '影像分析', '检验分析', '病历信息提取', '随访与预后评估']

export function MarketPage() {
  const [params, setParams] = useSearchParams()
  const initialQ = params.get('q') || ''
  const [keyword, setKeyword] = useState(initialQ)
  const [task, setTask] = useState('全部任务')
  const [specialty, setSpecialty] = useState('')
  const [products, setProducts] = useState<AlgorithmProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(q = keyword) {
    setLoading(true)
    setError('')
    try {
      let list
      if (q.trim()) {
        try {
          list = await smartSearchAlgorithmModels({
            requirement: q.trim(),
            description: q.trim(),
            domain: 'health',
          })
          if (!list.length) list = await searchAlgorithmModels(q.trim())
        } catch {
          list = await searchAlgorithmModels(q.trim())
        }
      } else {
        list = await filterAlgorithmModels({ domain: 'health' })
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
    void load(initialQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = products.filter((product) => {
    const card = readClinicalCard(product.raw)
    return (task === '全部任务' || card?.task === task) &&
      (!specialty || card?.specialty?.includes(specialty))
  })

  function applySearch() {
    const next = new URLSearchParams()
    if (keyword.trim()) next.set('q', keyword.trim())
    setParams(next)
    void load(keyword)
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc]" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <NavBar />
      <main className="pt-24 pb-16">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">临床算法目录</h1>
            <p className="text-sm text-gray-500 mt-2">仅展示已完成目录审核的临床模型。请核查适用人群和验证证据。</p>
          </div>

          <div className="bg-white rounded-2xl border border-black/5 p-4 mb-6 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl">
                <Search size={16} className="text-gray-400" />
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                  placeholder="搜索疾病、临床任务或模型名称"
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
              {TASKS.map((item) => (
                <button
                  key={item}
                  onClick={() => setTask(item)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    task === item
                      ? 'bg-blue-50 text-blue-600 border-blue-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="按专科筛选，例如：心血管、呼吸、肿瘤、重症" className="mt-3 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>

          {loading ? (
            <div className="text-center text-sm text-gray-400 py-20">加载中…</div>
          ) : error ? (
            <div className="text-center text-sm text-red-500 py-20">{error}</div>
          ) : visible.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-20">暂无符合条件且已审核的临床模型</div>
          ) : (
            <>
              <div className="text-xs text-gray-400 mb-4">共 {visible.length} 个结果</div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {visible.map((p) => (
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
