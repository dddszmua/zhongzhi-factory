import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { downloadClinicalReference, getClinicalReviewQueue, reviewClinicalService, type ClinicalReviewItem } from '@/api/services'
import { readClinicalCard } from '@/lib/clinical'

export function ClinicalReviewPage() {
  const [items, setItems] = useState<ClinicalReviewItem[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  async function refresh() {
    try {
      setItems(await getClinicalReviewQueue())
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取审核队列失败')
    }
  }

  useEffect(() => { void refresh() }, [])

  async function decide(id: string, decision: 'approved' | 'rejected') {
    setBusyId(id)
    try {
      await reviewClinicalService(id, decision)
      toast.success(decision === 'approved' ? '已通过目录审核' : '已驳回')
      await refresh()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '审核失败')
    } finally {
      setBusyId('')
    }
  }

  async function download(id: string, index: number, name: string) {
    try {
      const blob = await downloadClinicalReference(id, index)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '下载失败')
    }
  }

  return <div className="max-w-5xl p-6 lg:p-8 space-y-5">
    <div><h1 className="text-2xl font-bold">临床模型目录审核</h1><p className="text-sm text-gray-500 mt-1">核对说明卡、参考资料及使用范围后决定是否进入公开目录。通过审核不代表临床有效性认证。</p></div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {!error && items.length === 0 && <p className="text-sm text-gray-500">暂无待审核模型。</p>}
    {items.map((item) => {
      const card = readClinicalCard(item)
      return <section key={item.id} className="bg-white border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">{item.name}</h2>
        <p className="text-sm">{item.source?.msIntroduce || '暂无简介'}</p>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div><dt className="font-medium">适用人群</dt><dd>{card?.population || '未填写'}</dd></div>
          <div><dt className="font-medium">输入与输出</dt><dd>{card?.inputs || '未填写'} → {card?.output || '未填写'}</dd></div>
          <div><dt className="font-medium">允许用途</dt><dd>{card?.intendedUse || '未填写'}</dd></div>
          <div><dt className="font-medium">限制</dt><dd>{card?.limitations || '未填写'}</dd></div>
        </dl>
        {Boolean(item.referenceAssets?.length) && <div className="text-sm"><p className="font-medium mb-1">提交的参考资料</p>{item.referenceAssets?.map((asset, index) => <button key={`${item.id}-${index}`} onClick={() => void download(item.id, index, asset.name)} className="block text-blue-600 hover:underline">{asset.name}（SHA-256：{asset.sha256.slice(0, 12)}…）</button>)}</div>}
        {item.reproductionMode && <p className="text-sm">原文结果对照：{item.referenceCheck ? `${item.referenceCheck.passed ? '通过' : '未通过'} · ${item.referenceCheck.citation}` : '未提交'}</p>}
        <div className="flex gap-2"><button disabled={Boolean(busyId)} onClick={() => void decide(item.id, 'approved')} className="rounded-lg bg-green-700 px-4 py-2 text-white text-sm disabled:opacity-50">通过</button><button disabled={Boolean(busyId)} onClick={() => void decide(item.id, 'rejected')} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">驳回</button></div>
      </section>
    })}
  </div>
}
