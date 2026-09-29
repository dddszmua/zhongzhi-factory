import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { getMyAlgorithmModels, updateService } from '@/api/services'
import { useAuth } from '@/auth/AuthContext'
import { DOMAIN_OPTIONS, INDUSTRY_OPTIONS } from '@/lib/constants'
import type { BackendService } from '@/lib/mappers'
import { Btn } from '@/components/ui/Btn'

export function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [original, setOriginal] = useState<BackendService | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', domain: 'aml', industry: '', scenario: '' })

  useEffect(() => {
    if (!id || !user?.id) return
    getMyAlgorithmModels(user.id).then((items) => {
      const item = items.find((service) => service.id === id)
      if (!item || item.status === 'draft') throw new Error('商品不存在或无权编辑')
      setOriginal(item)
      setForm({ name: item.name, description: item.source?.msIntroduce || item.des || '', domain: item.domain || 'aml', industry: item.industry || '', scenario: item.scenario || '' })
    }).catch((error) => toast.error(error instanceof Error ? error.message : '加载失败')).finally(() => setLoading(false))
  }, [id, user?.id])

  async function save() {
    if (!id || !original || !form.name.trim()) {
      toast.error('请填写商品名称')
      return
    }
    setSaving(true)
    try {
      await updateService(id, {
        name: form.name.trim(), domain: form.domain, industry: form.industry,
        scenario: form.scenario, source: {
          ...original.source,
          popoverTitle: form.name.trim(),
          companyName: original.source?.companyName || '众智工场供应商',
          msIntroduce: form.description.trim(),
        },
      })
      toast.success('商品信息已保存')
      navigate('/supplier/products')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return <div className="p-6 lg:p-8 max-w-3xl">
    <button className="text-sm text-gray-500 mb-6" onClick={() => navigate('/supplier/products')}>← 返回我的算法商品</button>
    <h1 className="text-2xl font-bold text-gray-900">编辑算法商品</h1>
    <p className="text-sm text-gray-500 mt-1 mb-6">修改商品展示信息。源码和运行端点在试用配置页管理。</p>
    {loading ? <p className="text-gray-500">加载中…</p> : !original ? <p className="text-gray-500">无法编辑此商品。</p> :
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <label className="block text-sm font-semibold text-gray-700">商品名称<input value={form.name} maxLength={100} onChange={(event) => setForm({ ...form, name: event.target.value })} className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold text-gray-700">业务描述<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={5} className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal resize-y" /></label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm font-semibold text-gray-700">领域<select value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value })} className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal">{DOMAIN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block text-sm font-semibold text-gray-700">行业<select value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal"><option value="">未指定</option>{INDUSTRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        <label className="block text-sm font-semibold text-gray-700">业务场景<input value={form.scenario} maxLength={50} onChange={(event) => setForm({ ...form, scenario: event.target.value })} className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal" /></label>
        <div className="flex gap-3"><Btn disabled={saving} onClick={() => void save()}>{saving ? '保存中…' : '保存修改'}</Btn><Btn variant="outline" onClick={() => navigate(`/supplier/trial?id=${id}`)}>试用配置</Btn></div>
      </div>}
  </div>
}
