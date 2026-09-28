import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft, Eye, Play, Square } from 'lucide-react'
import { toast } from 'sonner'
import { deployService, getMyAlgorithmModels, getServiceById, stopService, updateService } from '@/api/services'
import { useAuth } from '@/auth/AuthContext'
import { mapServiceToProduct, mapServices, type AlgorithmProduct } from '@/lib/mappers'
import { mergeLocalAlgorithmProducts } from '@/lib/localProducts'
import { Btn } from '@/components/ui/Btn'
import { Badge } from '@/components/ui/Badge'
import { BLUE } from '@/lib/constants'

export function SupplierTrialPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const selectedId = params.get('id') || ''
  const [products, setProducts] = useState<AlgorithmProduct[]>([])
  const [product, setProduct] = useState<AlgorithmProduct | null>(null)
  const [endpoint, setEndpoint] = useState('')
  const [allowTrial, setAllowTrial] = useState(true)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function loadList() {
    if (!user?.id) {
      setProducts([])
      return [] as AlgorithmProduct[]
    }
    try {
      const list = await getMyAlgorithmModels(user.id, user.username)
      const mapped = mapServices(mergeLocalAlgorithmProducts(list, user.id))
      setProducts(mapped)
      return mapped
    } catch {
      const mapped = mapServices(mergeLocalAlgorithmProducts([], user.id))
      setProducts(mapped)
      return mapped
    }
  }

  async function loadOne(id: string) {
    if (id.startsWith('local-')) {
      const fromList = products.find((p) => p.id === id)
      if (fromList) {
        setProduct(fromList)
        setEndpoint(fromList.endpoint || '')
        return
      }
      const localMapped = mapServices(mergeLocalAlgorithmProducts([], user?.id || '')).find((p) => p.id === id)
      if (localMapped) {
        setProduct(localMapped)
        setEndpoint(localMapped.endpoint || '')
        return
      }
      setProduct(null)
      return
    }
    const svc = await getServiceById(id)
    const p = mapServiceToProduct(svc)
    setProduct(p)
    setEndpoint(p.endpoint || '')
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const mapped = await loadList()
        if (cancelled) return
        const id = selectedId || mapped[0]?.id
        if (id) {
          try {
            await loadOne(id)
          } catch {
            // 单条详情失败时保持列表空态，不打断整页
            setProduct(null)
          }
        } else {
          setProduct(null)
        }
      } catch {
        if (!cancelled) {
          setProducts([])
          setProduct(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, user?.id, user?.username])

  async function onSelect(id: string) {
    navigate(`/supplier/trial?id=${id}`, { replace: true })
    setLoading(true)
    try {
      await loadOne(id)
    } finally {
      setLoading(false)
    }
  }

  async function saveEndpoint() {
    if (!product) return
    if (product.id.startsWith('local-')) {
      toast.message('本地演示商品暂不支持保存试用地址，请重新发布到线上后再配置')
      return
    }
    setBusy(true)
    try {
      const apiList = product.raw.apiList?.length
        ? product.raw.apiList.map((api, idx) =>
            idx === 0 ? { ...api, url: endpoint, des: api.des || product.description } : api,
          )
        : [
            {
              name: product.name,
              url: endpoint,
              method: 'POST',
              des: product.description,
            },
          ]
      await updateService(product.id, { apiList })
      toast.success('试用地址已保存')
      await loadOne(product.id)
      await loadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  async function onDeploy() {
    if (!product) return
    if (product.id.startsWith('local-')) {
      toast.message('本地演示商品暂不支持部署')
      return
    }
    setBusy(true)
    try {
      await deployService(product.id)
      toast.success('已触发部署')
      await loadOne(product.id)
      await loadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '部署失败')
    } finally {
      setBusy(false)
    }
  }

  async function onStop() {
    if (!product) return
    if (product.id.startsWith('local-')) {
      toast.message('本地演示商品暂不支持停止')
      return
    }
    setBusy(true)
    try {
      await stopService(product.id)
      toast.success('已停止服务')
      await loadOne(product.id)
      await loadList()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '停止失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <button onClick={() => navigate('/supplier')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-4">
        <ArrowLeft size={14} /> 返回供应商中心
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">配置在线试用</h1>
        <p className="text-sm text-gray-500 mt-1">让买家在购买前可以试用算法，并明确交付方式。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-black/5 p-5">
            <div className="text-xs font-semibold text-gray-500 mb-2">选择算法商品</div>
            {loading && !product ? (
              <div className="text-sm text-gray-400">加载中…</div>
            ) : products.length === 0 ? (
              <div className="text-sm text-gray-400">
                暂无商品，
                <button className="text-blue-600 font-semibold" onClick={() => navigate('/supplier/create')}>
                  先去发布
                </button>
              </div>
            ) : (
              <select
                value={product?.id || ''}
                onChange={(e) => void onSelect(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}（{p.statusLabel}）
                  </option>
                ))}
              </select>
            )}
          </div>

          {product && (
            <>
              <div className="bg-white rounded-2xl border border-black/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">{product.name}</h2>
                  <Badge color={product.productStatus === 'listed' ? 'green' : 'amber'}>{product.statusLabel}</Badge>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={allowTrial} onChange={(e) => setAllowTrial(e.target.checked)} />
                  允许买家在线试用
                </label>
                <div>
                  <label className="text-xs font-semibold text-gray-600">试用服务地址</label>
                  <input
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400"
                    placeholder="https://… 或平台部署后的访问地址"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn disabled={busy} onClick={() => void saveEndpoint()}>
                    保存地址
                  </Btn>
                  <Btn disabled={busy} variant="secondary" onClick={() => void onDeploy()}>
                    <Play size={14} /> 部署服务
                  </Btn>
                  <Btn disabled={busy} variant="outline" onClick={() => void onStop()}>
                    <Square size={14} /> 停止服务
                  </Btn>
                  <Btn variant="ghost" onClick={() => navigate(`/products/${product.id}?trial=1`)}>
                    打开买家试用页
                  </Btn>
                </div>
                <p className="text-[11px] text-gray-400">
                  部署/停止调用既有平台接口。若算法包未上传或环境不可用，部署可能失败——可改用外部服务地址供买家试用。
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-black/5 p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-2">高级设置</h3>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>服务类型：{product.raw.type || '—'}</div>
                  <div>领域：{product.domainLabel}</div>
                  <div>原始状态：{product.status || '—'}</div>
                </div>
              </div>
            </>
          )}
        </div>

        <aside>
          <div className="bg-white rounded-2xl border border-black/5 p-5 sticky top-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-3">
              <Eye size={13} /> 买家试用页面预览
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
              <div className="text-xs font-bold text-gray-800">{product?.name || '算法商品'}</div>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-[10px] text-gray-400">
                上传样例或粘贴 JSON
              </div>
              <button className="w-full py-2 text-[10px] font-bold text-white rounded-lg" style={{ background: BLUE }}>
                ▶ 运行试用
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
