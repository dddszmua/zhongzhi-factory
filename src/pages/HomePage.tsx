import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Search,
  Upload,
  Play,
  SlidersHorizontal,
  Store,
  ArrowRight,
  CheckCircle,
  Star,
  Zap,
  Shield,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import { ProductCard } from '@/components/product/ProductCard'
import { filterAlgorithmModels, smartSearchAlgorithmModels } from '@/api/services'
import { recommendViaAgent } from '@/api/agent'
import { mapAlgorithmModels, type AlgorithmProduct } from '@/lib/mappers'
import { BLUE, PURPLE, GREEN } from '@/lib/constants'

export function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [finding, setFinding] = useState(false)
  const [products, setProducts] = useState<AlgorithmProduct[]>([])
  const [loadingMarket, setLoadingMarket] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await filterAlgorithmModels({ page: 1, pageSize: 6 })
        if (!cancelled) setProducts(mapAlgorithmModels(list).slice(0, 6))
      } catch {
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setLoadingMarket(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleFind() {
    const q = query.trim()
    if (!q) {
      toast.error('请先描述你的业务问题')
      return
    }
    setFinding(true)
    try {
      // 主路径：后端智能检索
      let list = await smartSearchAlgorithmModels({ requirement: q, description: q, domain: 'generic' })
      if (!list.length) {
        list = await smartSearchAlgorithmModels({ requirement: q, description: q, domain: 'aml' })
      }
      // 增强：尝试 Agent 推荐（失败不影响主流程）
      try {
        await recommendViaAgent(q)
      } catch {
        // ignore agent errors
      }
      const mapped = mapAlgorithmModels(list)
      if (!mapped.length) {
        toast.message('未找到精确匹配，已为你打开算法市场')
        navigate(`/market?q=${encodeURIComponent(q)}`)
        return
      }
      sessionStorage.setItem('zzf_find_results', JSON.stringify(mapped.map((p) => p.id)))
      navigate(`/market?q=${encodeURIComponent(q)}`)
      toast.success(`找到 ${mapped.length} 个相关算法`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '检索失败')
      navigate(`/market?q=${encodeURIComponent(q)}`)
    } finally {
      setFinding(false)
    }
  }

  const chips = ['客户流失预测', '产品缺陷识别', '合同文档审核', 'Excel数据报告']

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}>
      <NavBar />
      <main>
        {/* Hero */}
        <section
          className="relative pt-32 pb-20 overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #eef3ff 0%, #f8f9fc 40%, #fdf0ff 100%)' }}
        >
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: BLUE }} />
          <div className="absolute top-20 right-1/4 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: PURPLE }} />
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 relative">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-xs font-semibold text-blue-600 border border-blue-100 shadow-sm mb-6">
                <Zap size={12} />
                <span>AI 算法超市正式开放</span>
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-gray-900 leading-tight mb-5" style={{ letterSpacing: '-0.02em' }}>
                用业务语言找到、试用、
                <br />
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BLUE}, ${PURPLE})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  定制
                </span>{' '}
                AI 算法模型
              </h1>
              <p className="text-base lg:text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
                面向企业业务人员、CIO 和产品经理的算法模型超市。无需写代码，只需描述业务问题，平台帮你匹配可运行、可试用的算法模型。
              </p>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-4">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="请描述你的业务问题，例如：我想预测哪些客户可能流失"
                  rows={3}
                  className="w-full resize-none text-sm text-gray-700 placeholder-gray-400 outline-none leading-relaxed"
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => navigate('/market')}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all font-medium"
                  >
                    <Upload size={15} />
                    <span>去市场试用</span>
                  </button>
                  <button
                    type="button"
                    disabled={finding}
                    onClick={() => void handleFind()}
                    className="flex items-center gap-2 px-5 py-2 text-sm text-white font-semibold rounded-xl transition-all hover:opacity-90 shadow-md disabled:opacity-60"
                    style={{ background: `linear-gradient(90deg, ${BLUE}, ${PURPLE})` }}
                  >
                    <Search size={15} />
                    {finding ? '匹配中…' : '帮我找算法'}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <span className="text-xs text-gray-400">快速体验：</span>
                {chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setQuery(chip)}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-full text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="py-16 bg-white">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900">你想先做什么？</h2>
              <p className="text-gray-500 mt-2 text-sm">选择你当前的目标，快速开始</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: Search, title: '找算法', desc: '用一句业务需求，匹配可试用的算法模型。', btn: '开始找算法', color: BLUE, bg: '#eef3ff', action: () => navigate('/market') },
                { icon: Play, title: '试算法', desc: '上传样例数据，立即查看算法运行结果。', btn: '去试用', color: PURPLE, bg: '#f3f0ff', action: () => navigate('/market') },
                { icon: SlidersHorizontal, title: '定制算法', desc: '基于现有模型，按你的业务场景对接。', btn: '浏览市场', color: '#0ea5e9', bg: '#e0f2fe', action: () => navigate('/market') },
                { icon: Store, title: '发布算法', desc: '算法供应商可上架模型并配置在线试用。', btn: '发布模型', color: GREEN, bg: '#dcfce7', action: () => navigate('/supplier/create') },
              ].map(({ icon: Icon, title, desc, btn, color, bg, action }) => (
                <div
                  key={title}
                  className="group relative bg-white border border-black/5 rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden"
                  onClick={action}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-30 -translate-y-8 translate-x-8" style={{ background: bg }} />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 relative" style={{ background: bg }}>
                    <Icon size={22} style={{ color }} />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5">{desc}</p>
                  <span className="flex items-center gap-1.5 text-sm font-semibold transition-all group-hover:gap-2.5" style={{ color }}>
                    {btn} <ArrowRight size={14} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Market preview */}
        <section className="py-16" style={{ background: '#f8f9fc' }}>
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">AI 算法市场</h2>
                <p className="text-gray-500 mt-2 text-sm">像逛电商一样浏览、试用和对比算法模型。</p>
              </div>
              <button
                onClick={() => navigate('/market')}
                className="hidden lg:flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                查看全部 <ChevronRight size={16} />
              </button>
            </div>
            {loadingMarket ? (
              <div className="text-center text-sm text-gray-400 py-16">正在加载算法商品…</div>
            ) : products.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-16">
                暂无算法商品。请确认后端服务已启动，或先到供应商中心发布。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="py-16" style={{ background: 'linear-gradient(160deg, #f0f4ff 0%, #f8f9fc 100%)' }}>
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">从业务需求到算法试用，只需 4 步</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0">
              {[
                { num: '01', icon: <CheckCircle size={22} className="text-blue-500" />, title: '说需求', desc: '用自然语言描述业务问题。' },
                { num: '02', icon: <Search size={22} className="text-blue-500" />, title: '匹配算法', desc: '平台推荐可试用的算法模型。' },
                { num: '03', icon: <Play size={22} className="text-blue-500" />, title: '在线试用', desc: '上传样例或输入数据，查看运行结果。' },
                { num: '04', icon: <Star size={22} className="text-blue-500" />, title: '对接交付', desc: '联系供应商完成场景对接与交付。' },
              ].map(({ num, icon, title, desc }, i, arr) => (
                <div key={num} className="relative flex flex-col items-center text-center px-6 py-8">
                  {i < arr.length - 1 && (
                    <div className="hidden xl:block absolute top-12 right-0 w-1/2 h-px border-t-2 border-dashed border-blue-200 translate-x-1/2" />
                  )}
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm bg-white border border-black/5 relative z-10">
                    {icon}
                  </div>
                  <div className="text-xs font-bold text-blue-400 mb-1 tracking-widest">{num}</div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Supplier CTA */}
        <section className="py-20" style={{ background: `linear-gradient(135deg, ${BLUE} 0%, ${PURPLE} 100%)` }}>
          <div className="max-w-[1440px] mx-auto px-6 lg:px-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-3">让算法模型流通起来</h2>
            <p className="text-blue-100 text-sm max-w-xl mx-auto leading-relaxed mb-8">
              高校团队、算法公司、行业专家都可以在平台发布算法模型，形成可试用、可交付的算法商品。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 text-left">
              {[
                { icon: Upload, title: '发布模型', desc: '用业务语言描述算法，配置输入输出与试用。' },
                { icon: Shield, title: '开启试用', desc: '部署服务后，买家即可在线体验效果。' },
                { icon: Star, title: '持续迭代', desc: '根据试用反馈完善商品与文档。' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                    <Icon size={18} className="text-white" />
                  </div>
                  <h3 className="font-bold text-white text-base mb-2">{title}</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/supplier')}
              className="px-8 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg text-sm"
            >
              成为算法供应商 →
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
