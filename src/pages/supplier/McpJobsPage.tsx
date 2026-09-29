import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { createMcpJob, listMcpJobs, type McpJob } from '@/api/mcpPackaging'

const labels: Record<string, string> = {
  draft: '编辑中', packaging: '正在生成', packaged: '封装包已生成',
  deploying: '正在部署', deployed: '已通过协议验证', failed: '生成失败',
  cancelling: '正在取消', cancelled: '已取消', interrupted: '任务中断',
  awaiting_check: '待工具验证', deploy_failed: '部署失败',
}

export function McpJobsPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<McpJob[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listMcpJobs().then(setJobs).catch((cause) => setError(cause instanceof Error ? cause.message : '读取失败'))
  }, [])

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const job = await createMcpJob()
      navigate(`/supplier/mcp/jobs/${job.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建失败')
      setBusy(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="flex justify-between items-start gap-4 mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">我的 MCP 服务</h1><p className="text-sm text-gray-500 mt-1">将自己的算法封装为可由智能助手调用的工具。</p></div>
        <button disabled={busy} onClick={create} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">新建封装</button>
      </div>
      {error && <p role="alert" className="text-red-600 text-sm mb-4">{error}</p>}
      <div className="space-y-3">
        {jobs.length === 0 && !error && <p className="bg-white border rounded-xl p-8 text-sm text-gray-500">暂无封装任务。可从这里上传代码，也可以在“我的算法商品”中选择算法。</p>}
        {jobs.map((job) => (
          <button key={job.id} onClick={() => navigate(`/supplier/mcp/jobs/${job.id}`)} className="w-full bg-white border rounded-xl p-5 text-left hover:border-blue-300">
            <div className="flex justify-between gap-4"><span className="font-semibold text-gray-900">{job.spec.service_name || job.sourceName || '未命名封装'}</span><span className="text-xs text-blue-700">{labels[job.status] || job.status}</span></div>
            <div className="text-sm text-gray-500 mt-2">{job.sourceName || '等待选择源码'} · {new Date(job.updatedAt).toLocaleString()}</div>
            {job.error && <div className="text-sm text-red-600 mt-2">{job.error}</div>}
          </button>
        ))}
      </div>
    </div>
  )
}
