import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { filterServices } from '@/api/services'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import type { BackendService } from '@/lib/mappers'
import { isClinicalListed } from '@/lib/clinical'

export function McpMarketPage() {
  const [services, setServices] = useState<BackendService[]>([])
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    filterServices({ type: 'atomic_mcp', status: 'released' })
      .then((items) => setServices(items.filter((item) => item.type === 'atomic_mcp' && item.status === 'released' && isClinicalListed(item))))
      .catch((cause) => setError(cause instanceof Error ? cause.message : '加载失败'))
      .finally(() => setLoading(false))
  }, [])

  const visible = useMemo(() => services.filter((item) =>
    `${item.name} ${item.des || ''} ${item.scenario || ''}`.toLowerCase().includes(keyword.trim().toLowerCase()),
  ), [services, keyword])

  return <div className="min-h-screen bg-[#f8f9fc]"><NavBar /><main className="max-w-[1280px] mx-auto px-6 pt-24 pb-20">
    <h1 className="text-3xl font-bold text-gray-900">临床可调用服务</h1>
    <p className="text-sm text-gray-500 mt-2">仅展示已通过临床目录审核的服务；接口调用成功不代表临床有效。</p>
    <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索服务名称或场景" aria-label="搜索 MCP 服务" className="mt-6 w-full bg-white border rounded-xl px-4 py-3 text-sm" />
    {error && <p role="alert" className="text-red-600 mt-6 text-sm">{error}</p>}
    {loading && <p className="text-gray-500 mt-6 text-sm">正在加载…</p>}
    {!loading && !error && visible.length === 0 && <p className="bg-white border rounded-xl p-8 mt-6 text-sm text-gray-500">暂无符合条件的已发布 MCP 服务。</p>}
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
      {visible.map((service) => <Link key={service.id} to={`/mcp-services/${service.id}`} className="bg-white border rounded-xl p-5 hover:border-blue-300">
        <span className="text-xs text-blue-700">MCP 服务</span><h2 className="font-semibold text-gray-900 mt-2">{service.name}</h2>
        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{service.des || service.source?.msIntroduce || service.scenario || '查看服务工具和接入说明'}</p>
        <p className="text-xs text-gray-400 mt-4">临床医疗 · 查看工具详情</p>
      </Link>)}
    </div>
  </main><Footer /></div>
}
