import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, Play, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import { Badge } from '@/components/ui/Badge'
import { Btn } from '@/components/ui/Btn'
import { getServiceById, trialInvoke } from '@/api/services'
import { mapServiceToProduct, type AlgorithmProduct } from '@/lib/mappers'
import { BLUE } from '@/lib/constants'

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<AlgorithmProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('{\n  "sample": "请输入试用请求 JSON"\n}')
  const [result, setResult] = useState<string>('')
  const [running, setRunning] = useState(false)
  const showTrial = params.get('trial') === '1'

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const svc = await getServiceById(id)
        if (!cancelled) {
          const p = mapServiceToProduct(svc)
          setProduct(p)
          if (p.exampleMsg) {
            setInputText(JSON.stringify(p.exampleMsg, null, 2))
          }
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

  async function runTrial() {
    if (!product) return
    if (!product.endpoint) {
      toast.error('该算法尚未配置可访问地址，请联系供应商开启试用')
      setResult('无法试用：服务端点未配置。供应商可在「在线试用配置」中部署服务。')
      return
    }
    let payload: unknown = inputText
    try {
      payload = JSON.parse(inputText)
    } catch {
      // 按纯文本发送
      payload = { text: inputText }
    }
    setRunning(true)
    setResult('')
    try {
      const res = await trialInvoke(product.endpoint, payload, product.method)
      setResult(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2))
      if (res.ok) toast.success('试用完成')
      else toast.message(`服务返回状态 ${res.status}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '试用调用失败'
      setResult(msg)
      toast.error(msg)
    } finally {
      setRunning(false)
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
            <div className="text-sm text-gray-400 py-20 text-center">未找到该算法商品</div>
          ) : (
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
                      <div className="text-[11px] text-gray-400 mb-1">行业场景</div>
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
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2" id="trial-panel">
                <div className={`bg-white rounded-2xl border border-black/5 p-5 sticky top-24 ${showTrial ? 'ring-2 ring-blue-100' : ''}`}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-3">
                    <UploadCloud size={13} /> 在线试用
                  </div>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                    输入样例 JSON 或文本，调用供应商已配置的服务地址查看结果。首期不支持在线支付。
                  </p>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={8}
                    className="w-full text-xs font-mono border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-400 resize-y"
                  />
                  <button
                    disabled={running}
                    onClick={() => void runTrial()}
                    className="w-full mt-3 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-60"
                    style={{ background: BLUE }}
                  >
                    {running ? '运行中…' : '▶ 运行试用'}
                  </button>
                  {result && (
                    <pre className="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-3 text-[11px] text-gray-700 overflow-auto max-h-64 whitespace-pre-wrap">
                      {result}
                    </pre>
                  )}
                  {!product.endpoint && (
                    <p className="text-[11px] text-amber-600 mt-3">当前商品尚未配置可访问端点，试用可能不可用。</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
