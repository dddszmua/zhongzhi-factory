import { useEffect, useState } from 'react'
import { getClinicalCatalog, type ClinicalPaper } from '@/api/clinicalCatalog'

export function PaperPicker({ departmentId, busy, onSelect }: {
  departmentId: string; busy: boolean; onSelect: (paper: ClinicalPaper) => void
}) {
  const [papers, setPapers] = useState<ClinicalPaper[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    getClinicalCatalog().then(data => { if (active) setPapers(data.papers) })
      .catch(() => { if (active) setError('论文列表暂时无法加载，请重试。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [retry])
  if (!departmentId) return <p className="rounded-xl bg-slate-50 p-5 text-sm text-gray-600">先选择科室，查看相关示例论文。</p>
  if (loading) return <p role="status">正在读取论文…</p>
  if (error) return <p role="alert">{error} <button className="text-blue-700 underline" onClick={() => setRetry(n => n + 1)}>重试</button></p>
  const relevant = papers.filter(p => p.departmentIds.includes(departmentId))
  return <section className="space-y-3" aria-label="本科室示例论文">
    <p className="text-sm text-gray-600">选择论文后，平台自动载入论文和预设复现要求，无需下载上传。</p>
    {relevant.map(p => <article key={p.id} className="rounded-xl border bg-white p-5 space-y-3">
      <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{p.modelName}</h3><span className="shrink-0 text-xs text-gray-500">{p.year}</span></div>
      <p className="text-sm text-gray-600">自动载入论文，可修改复现要求后生成模型。</p>
      <p className="text-xs text-gray-500">{p.canCreate ? '论文已收录 · 已预设复现要求' : '论文文件暂不可用，请稍后重试'}</p>
      <div className="flex flex-wrap items-center gap-4">
        <button disabled={busy || !p.canCreate} onClick={() => onSelect(p)} className="cw-button disabled:opacity-50">{busy ? '正在处理…' : '使用此论文复现'}</button>
        <a className="text-sm text-blue-700" href={p.sourceUrl} target="_blank" rel="noreferrer">查看原文</a>
      </div>
      <details className="text-xs text-gray-500"><summary className="cursor-pointer">来源与使用说明</summary><p className="mt-2">DOI：{p.doi} · 材料版本 {p.version}</p><p>{p.scope}</p><p>{p.accessNote}</p><p>{p.license}。材料备齐不代表新生成算法已通过计算或临床验证。</p></details>
    </article>)}
  </section>
}
