import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, Heart, Play } from 'lucide-react'
import { toast } from 'sonner'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import { Badge } from '@/components/ui/Badge'
import { Btn } from '@/components/ui/Btn'
import { ClinicalTrialPanel } from '@/components/product/ClinicalTrialPanel'
import { getPublicClinicalServiceById } from '@/api/services'
import { addInterested, getInterestedAlgorithms, removeInterested, sendInquiry } from '@/api/marketplace'
import { useAuth } from '@/auth/AuthContext'
import { mapServiceToProduct, type AlgorithmProduct } from '@/lib/mappers'
import { isClinicalListed, readClinicalCard } from '@/lib/clinical'

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [product, setProduct] = useState<AlgorithmProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [interested, setInterested] = useState(false)
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [inquiry, setInquiry] = useState('')
  const [inquiryBusy, setInquiryBusy] = useState(false)
  const showTrial = params.get('trial') === '1'

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const svc = await getPublicClinicalServiceById(id)
        if (!cancelled) {
          const p = mapServiceToProduct(svc)
          setProduct(isClinicalListed(svc) ? p : null)
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : '加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!id || !isAuthenticated) return
    getInterestedAlgorithms().then((list) => setInterested(list.some((service) => service.id === id))).catch(() => setInterested(false))
  }, [id, isAuthenticated])

  async function toggleFavorite() {
    if (!id) return
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/products/${id}`)}`)
      return
    }
    setFavoriteBusy(true)
    try {
      if (interested) await removeInterested(id)
      else await addInterested(id)
      setInterested(!interested)
      toast.success(interested ? '已取消收藏' : '已加入收藏')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setFavoriteBusy(false)
    }
  }

  async function submitInquiry() {
    if (!id || !inquiry.trim()) return
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/products/${id}`)}`)
      return
    }
    setInquiryBusy(true)
    try {
      await sendInquiry(id, inquiry.trim())
      setInquiry('')
      toast.success('咨询已发送，可在消息中心查看回复')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '咨询发送失败')
    } finally {
      setInquiryBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc]" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <NavBar />
      <main className="pt-24 pb-16">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-6"
          >
            <ArrowLeft size={14} /> 返回
          </button>

          {loading ? (
            <div className="text-sm text-gray-400 py-20 text-center">加载中…</div>
          ) : !product ? (
            <div className="text-sm text-gray-400 py-20 text-center">该模型未进入临床公开目录</div>
          ) : (<>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 space-y-5">
                <div className="bg-white rounded-2xl border border-black/5 p-6">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {product.badges.map((b) => (
                      <Badge key={b.label} color={b.color}>
                        {b.label}
                      </Badge>
                    ))}
                  </div>
                  <h1 className="text-2xl font-extrabold text-gray-900">{product.name}</h1>
                  <p className="text-sm text-gray-500 mt-3 leading-relaxed">{product.description}</p>
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-400 mb-1">输入</div>
                      <div className="text-sm font-semibold text-gray-800">{product.inputType}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-400 mb-1">输出</div>
                      <div className="text-sm font-semibold text-gray-800">{product.outputType}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-400 mb-1">临床领域</div>
                      <div className="text-sm font-semibold text-gray-800">{product.domainLabel}</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-[11px] text-gray-400 mb-1">状态</div>
                      <div className="text-sm font-semibold text-gray-800">{product.statusLabel}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {product.tags.map((t) => (
                      <Badge key={t} color="gray">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Btn onClick={() => document.getElementById('trial-panel')?.scrollIntoView({ behavior: 'smooth' })}>
                      <Play size={14} /> 在线试用
                    </Btn>
                    <Link to="/market">
                      <Btn variant="outline">浏览更多</Btn>
                    </Link>
                    <Btn variant="outline" disabled={favoriteBusy} onClick={() => void toggleFavorite()}>
                      <Heart size={14} className={interested ? 'fill-blue-600 text-blue-600' : ''} /> {interested ? '已收藏' : '收藏'}
                    </Btn>
                  </div>
                </div>
                <section className="bg-white rounded-2xl border border-black/5 p-6" aria-label="临床模型说明卡">
                  <h2 className="font-bold text-gray-900 mb-2">临床模型说明卡</h2>
                  <p className="text-xs text-gray-500 mb-4">目录审核、代码运行和临床验证分别记录。接口可调用不代表模型通过临床验证。</p>
                  <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                    {([
                      ['临床任务', 'task'], ['专科场景', 'specialty'], ['适用人群', 'population'], ['不适用情况', 'exclusions'],
                      ['输入字段', 'inputs'], ['计量单位', 'units'], ['缺失值处理', 'missing'], ['输出含义', 'output'],
                      ['预测时间范围', 'horizon'], ['阈值依据', 'threshold'], ['数据来源', 'dataSource'], ['评估样本量', 'sampleSize'],
                      ['验证方式', 'validation'], ['实际评估结果', 'results'], ['允许使用场景', 'intendedUse'],
                      ['模型版本', 'version'], ['开发团队', 'team'], ['参考文献', 'references'], ['已知限制', 'limitations'],
                    ] as const).map(([label, key]) => <div key={key}><dt className="text-gray-400 text-xs">{label}</dt><dd className="text-gray-800 mt-1 whitespace-pre-wrap">{readClinicalCard(product.raw)?.[key] || '尚未提供'}</dd></div>)}
                  </dl>
                  <div className="mt-5 grid sm:grid-cols-3 gap-3 text-xs">
                    <p className="bg-blue-50 p-3 rounded-lg">在线运行：{product.trialable ? '样例运行已通过，可按权限试用' : '尚未开放试用'}</p>
                    <p className="bg-blue-50 p-3 rounded-lg">接口验证：未提供独立报告</p>
                    <p className="bg-blue-50 p-3 rounded-lg">临床数据验证：{readClinicalCard(product.raw)?.validation || '未提供'}</p>
                  </div>
                </section>
                {(!user?.id || product.creatorId !== user.id) && <div className="bg-white rounded-2xl border border-black/5 p-6">
                  <h2 className="font-bold text-gray-900">咨询供应商</h2>
                  <p className="text-xs text-gray-500 mt-1 mb-3">描述业务需求或试用问题，供应商会在消息中心回复。</p>
                  <textarea value={inquiry} onChange={(event) => setInquiry(event.target.value)} maxLength={2000} rows={4} placeholder="例如：我的数据格式能否用于这个算法？" className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-y" />
                  <div className="flex items-center gap-4 mt-3"><Btn disabled={inquiryBusy || !inquiry.trim()} onClick={() => void submitInquiry()}>{inquiryBusy ? '发送中…' : '发送咨询'}</Btn><Link className="text-sm text-blue-600" to="/messages">查看消息</Link></div>
                </div>}
              </div>

              <div className="lg:col-span-2" id="trial-panel">
                <div className={showTrial ? 'ring-2 ring-blue-100 rounded-2xl' : ''}><ClinicalTrialPanel modelId={product.id} isAuthenticated={isAuthenticated} /></div>
              </div>
            </div>
          </>)}
        </div>
      </main>
      <Footer />
    </div>
  )
}
