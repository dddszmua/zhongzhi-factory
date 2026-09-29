import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { getGeneratedCode, getMyAlgorithmModels } from '@/api/services'
import { useAuth } from '@/auth/AuthContext'
import { Btn } from '@/components/ui/Btn'

export function GeneratedCodePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [file, setFile] = useState<Blob | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !user?.id) return
    let cancelled = false
    ;(async () => {
      try {
        const owned = (await getMyAlgorithmModels(user.id)).find((item) => item.id === id)
        if (!owned) throw new Error('成果不存在或无权查看')
        const blob = await getGeneratedCode(id)
        if (!cancelled) {
          setName(owned.name)
          setFile(blob)
          setCode(await blob.text())
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '源码加载失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, user?.id])

  function download() {
    if (!file || !id) return
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${name || id}_algorithm.py`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success('已开始下载源码')
  }

  return <div className="p-6 lg:p-8 max-w-5xl">
    <button className="text-sm text-gray-500 mb-6" onClick={() => navigate('/supplier/products')}>← 返回我的算法商品</button>
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div><h1 className="text-2xl font-bold text-gray-900">生成成果</h1><p className="text-sm text-gray-500 mt-1">{name || '算法模型'}的生成源码</p></div>
      {file && <Btn onClick={download}>下载 Python 源码</Btn>}
    </div>
    {loading ? <p className="text-gray-500">加载中…</p> : error ? <div className="bg-white rounded-2xl border border-gray-100 p-6 text-gray-600">{error}。只有通过 AI 生成并保存了源码的商品可以查看此页面。</div> :
      <pre className="bg-slate-950 text-slate-100 rounded-2xl p-6 overflow-auto text-xs leading-relaxed max-h-[70vh]"><code>{code}</code></pre>}
  </div>
}
