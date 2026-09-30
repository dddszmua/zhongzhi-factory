import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ShoppingBag, Play, PlusCircle, FlaskConical, AlertCircle } from 'lucide-react'
import { getMyAlgorithmModels } from '@/api/services'
import { useAuth } from '@/auth/AuthContext'
import { mapServices, type AlgorithmProduct } from '@/lib/mappers'
import { Badge } from '@/components/ui/Badge'
import { BLUE, PURPLE, AMBER, GREEN } from '@/lib/constants'

export function SupplierDashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [products, setProducts] = useState<AlgorithmProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        if (!cancelled) setProducts(mapServices(list))
      } catch (cause) {
        if (!cancelled) {
          setProducts([])
          setError(cause instanceof Error ? cause.message : '商品加载失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.username])

  const listed = products.filter((p) => p.productStatus === 'listed').length
  const draft = products.filter((p) => p.productStatus === 'draft').length
  const trials = products.reduce((sum, p) => sum + (p.trialCount || 0), 0)

  const kpis = [
    { label: '已发布算法', value: String(listed), icon: ShoppingBag, color: BLUE, bg: '#eef3ff', delta: `共 ${products.length} 个` },
    { label: '草稿算法', value: String(draft), icon: AlertCircle, color: AMBER, bg: '#fffbeb', delta: '待完善' },
    { label: '累计调用次数', value: trials.toLocaleString(), icon: Play, color: PURPLE, bg: '#f3f0ff', delta: '来自平台统计' },
    { label: '可试用商品', value: String(products.filter((p) => p.trialable).length), icon: FlaskConical, color: GREEN, bg: '#dcfce7', delta: '已部署' },
  ]

  const actions = [
    { title: '发布新算法', desc: '用业务语言创建算法商品，可选 AI 生成模型。', btn: '开始发布', icon: PlusCircle, color: BLUE, to: '/supplier/create' },
    { title: '配置在线试用', desc: '核对输入规范并运行合成样例，审核后开放试用。', btn: '配置试用', icon: FlaskConical, color: PURPLE, to: '/supplier/trial' },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">供应商中心</h1>
        <p className="text-sm text-gray-500 mt-1">管理你的算法商品与在线试用配置。</p>
      </div>
      {error && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">商品数据加载失败：{error}</div>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg, delta }) => (
          <div key={label} className="bg-white rounded-2xl border border-black/5 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="text-xs text-gray-400 font-medium">{delta}</span>
            </div>
            <div className="text-2xl font-extrabold text-gray-900 mb-0.5">{loading ? '—' : value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map(({ title, desc, btn, icon: Icon, color, to }) => (
          <div key={title} className="bg-white rounded-2xl border border-black/5 p-5 flex flex-col">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}15` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
            <p className="text-xs text-gray-500 mb-4 flex-1">{desc}</p>
            <button
              onClick={() => navigate(to)}
              className="self-start px-4 py-2 text-xs font-semibold text-white rounded-xl"
              style={{ background: color }}
            >
              {btn}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">最近算法商品</h3>
          <button onClick={() => navigate('/supplier/products')} className="text-xs text-blue-600 font-semibold">
            查看全部
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">加载中…</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            还没有算法商品，
            <button className="text-blue-600 font-semibold ml-1" onClick={() => navigate('/supplier/create')}>
              立即发布
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                  <th className="px-5 py-3 font-medium">算法商品</th>
                  <th className="px-3 py-3 font-medium">输入</th>
                  <th className="px-3 py-3 font-medium">输出</th>
                  <th className="px-3 py-3 font-medium">状态</th>
                  <th className="px-3 py-3 font-medium">调用</th>
                  <th className="px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 8).map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{p.inputType}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{p.outputType}</td>
                    <td className="px-3 py-3">
                      <Badge color={p.productStatus === 'listed' ? 'green' : 'amber'}>{p.statusLabel}</Badge>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{p.trialCount}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        <button className="text-xs text-blue-600 font-semibold" onClick={() => navigate(`/products/${p.id}`)}>
                          详情
                        </button>
                        <button className="text-xs text-gray-500 font-semibold" onClick={() => navigate(`/supplier/trial?id=${p.id}`)}>
                          试用配置
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
