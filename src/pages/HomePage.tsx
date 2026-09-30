import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Search,
  Upload,
  Play,
  SlidersHorizontal,
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
        const list = await filterAlgorithmModels({ domain: 'health', page: 1, pageSize: 50 })
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
      toast.error('请先描述临床问题')
      return
    }
    setFinding(true)
    try {
      // 主路径：后端智能检索
      const list = await smartSearchAlgorithmModels({ requirement: q, description: q, domain: 'health' })
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

  const chips = ['入院患者风险预测', '胸部影像辅助筛查', '检验指标分析', '随访预后评估']

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
                <span>临床医疗算法模型众智工场</span>
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-gray-900 leading-tight mb-5" style={{ letterSpacing: '-0.02em' }}>
                从临床问题出发，找到、验证、
                <br />
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BLUE}, ${PURPLE})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  开发
                </span>{' '}
                AI 算法模型
              </h1>
              <p className="text-base lg:text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
                面向临床医生与医学研究团队，描述研究问题、查找已有模型，并核查模型的适用范围与验证证据。
              </p>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-4">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="例如：用入院时可获得的数据预测成年住院患者 30 天内再入院风险"
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
                { icon: Search, title: '找临床算法', desc: '按临床任务查找已有模型与验证证据。', btn: '浏览目录', color: BLUE, bg: '#eef3ff', action: () => navigate('/market') },
                { icon: SlidersHorizontal, title: '描述临床需求', desc: '明确患者、使用时点、可用数据和结局。', btn: '填写需求', color: PURPLE, bg: '#f3f0ff', action: () => navigate('/demand') },
                { icon: Play, title: '验证我的模型', desc: '在研发工作台整理模型、样例和评估结果。', btn: '进入工作台', color: GREEN, bg: '#dcfce7', action: () => navigate('/supplier') },
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
                <h2 className="text-3xl font-bold text-gray-900">临床算法目录</h2>
                <p className="text-gray-500 mt-2 text-sm">查看模型说明卡、适用人群与已有验证证据。</p>
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
                暂无完成临床目录审核的模型。
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
              <h2 className="text-3xl font-bold text-gray-900">从临床问题到模型服务</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0">
              {[
                { num: '01', icon: <CheckCircle size={22} className="text-blue-500" />, title: '明确问题', desc: '说明患者、预测时点与临床结局。' },
                { num: '02', icon: <Search size={22} className="text-blue-500" />, title: '查找模型', desc: '核对输入字段、适用人群和限制。' },
                { num: '03', icon: <Play size={22} className="text-blue-500" />, title: '数据验证', desc: '用独立数据评估模型效果。' },
                { num: '04', icon: <Star size={22} className="text-blue-500" />, title: '服务封装', desc: '固定版本、输入输出与调用权限。' },
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
            <h2 className="text-3xl font-bold text-white mb-3">建设可核查的临床模型目录</h2>
            <p className="text-blue-100 text-sm max-w-xl mx-auto leading-relaxed mb-8">
              医学研究团队可提交模型、适用范围与验证资料，完成审核后进入公开目录。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10 text-left">
              {[
                { icon: Upload, title: '提交模型', desc: '描述目标患者、输入字段与输出含义。' },
                { icon: Shield, title: '记录证据', desc: '分别记录接口验证与临床数据验证。' },
                { icon: Star, title: '持续迭代', desc: '按模型版本维护证据与已知限制。' },
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
              进入研发工作台 →
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
