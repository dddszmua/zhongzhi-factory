import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { getServiceById } from '@/api/services'
import { sendInquiry } from '@/api/marketplace'
import { useAuth } from '@/auth/AuthContext'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import type { BackendService } from '@/lib/mappers'

export function McpServicePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [service, setService] = useState<BackendService | null>(null)
  const [error, setError] = useState('')
  const [inquiry, setInquiry] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!id) return
    getServiceById(id).then((item) => {
      if (item.type !== 'atomic_mcp' || item.status !== 'released') throw new Error('服务尚未发布或不存在')
      setService(item)
    }).catch((cause) => setError(cause instanceof Error ? cause.message : '加载失败'))
  }, [id])

  const submit = async () => {
    if (!id || !inquiry.trim()) return
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/mcp-services/${id}`)}`)
      return
    }
    setSending(true)
    try {
      await sendInquiry(id, inquiry.trim())
      setInquiry('')
      toast.success('咨询已发送，可在消息中心查看回复')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '发送失败')
    } finally {
      setSending(false)
    }
  }

  return <div className="min-h-screen bg-[#f8f9fc]"><NavBar /><main className="max-w-4xl mx-auto px-6 pt-24 pb-20">
    <Link to="/mcp-market" className="text-sm text-blue-600">← MCP 服务市场</Link>
    {error && <p role="alert" className="mt-8 text-red-600">{error}</p>}
    {!error && !service && <p className="mt-8 text-sm text-gray-500">正在加载…</p>}
    {service && <><div className="bg-white border rounded-2xl p-7 mt-6"><span className="text-xs text-blue-700">已发布 MCP 服务</span><h1 className="text-2xl font-bold mt-2">{service.name}</h1><p className="text-gray-600 mt-3">{service.des || service.source?.msIntroduce || service.scenario || '暂无服务介绍'}</p><p className="text-xs text-gray-500 mt-4">领域：{service.domain || '通用'} · 工具数：{service.tools?.length || 0}</p></div>
      <section className="mt-6"><h2 className="font-semibold text-lg mb-3">可用工具</h2><div className="space-y-3">{(service.tools || []).map((tool) => <div key={tool.name} className="bg-white border rounded-xl p-5"><h3 className="font-medium">{tool.name}</h3><p className="text-sm text-gray-500 mt-1">{tool.description || '暂无说明'}</p></div>)}</div></section>
      <section className="bg-white border rounded-xl p-5 mt-6"><h2 className="font-semibold">咨询服务提供方</h2><p className="text-sm text-gray-500 mt-1">说明你希望接入的智能助手、使用场景和调用需求。</p><textarea value={inquiry} onChange={(event) => setInquiry(event.target.value)} maxLength={2000} className="border rounded-lg p-3 w-full h-24 text-sm mt-3" placeholder="请描述你的接入需求" /><div className="flex gap-3 items-center mt-3"><button disabled={sending || !inquiry.trim()} onClick={() => void submit()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{sending ? '发送中…' : '发送咨询'}</button><Link to="/messages" className="text-sm text-blue-600">查看消息</Link></div></section></>}
  </main><Footer /></div>
}
