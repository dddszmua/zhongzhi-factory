import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { getMyAlgorithmModels, updateService } from '@/api/services'
import { useAuth } from '@/auth/AuthContext'
import { DOMAIN_OPTIONS, INDUSTRY_OPTIONS } from '@/lib/constants'
import { emptyClinicalCard, encodeClinicalCard, readClinicalCard, type ClinicalCard } from '@/lib/clinical'
import type { BackendService } from '@/lib/mappers'
import { Btn } from '@/components/ui/Btn'

const cardFields: Array<{ key: keyof ClinicalCard; label: string }> = [
  { key: 'specialty', label: '专科' }, { key: 'population', label: '适用人群与纳入条件' },
  { key: 'exclusions', label: '排除与不适用情况' }, { key: 'inputs', label: '输入字段及医学含义' },
  { key: 'units', label: '计量单位和允许范围' }, { key: 'missing', label: '缺失值处理' },
  { key: 'output', label: '输出含义' }, { key: 'timepoint', label: '使用时点' }, { key: 'horizon', label: '预测时间范围' },
  { key: 'threshold', label: '阈值依据' }, { key: 'dataSource', label: '数据来源' },
  { key: 'sampleSize', label: '评估样本量' }, { key: 'validation', label: '验证方式' },
  { key: 'results', label: '实际评估结果' }, { key: 'version', label: '模型版本' },
  { key: 'team', label: '开发团队' }, { key: 'references', label: '参考文献' },
  { key: 'limitations', label: '已知限制' }, { key: 'intendedUse', label: '允许使用场景' },
]

export function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [original, setOriginal] = useState<BackendService | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', domain: 'health', industry: '临床医疗', scenario: '' })
  const [card, setCard] = useState<ClinicalCard>(emptyClinicalCard)

  useEffect(() => {
    if (!id || !user?.id) return
    getMyAlgorithmModels(user.id).then((items) => {
      const item = items.find((service) => service.id === id)
      if (!item || item.status === 'draft') throw new Error('商品不存在或无权编辑')
      setOriginal(item)
      setForm({ name: item.name, description: item.source?.msIntroduce || item.des || '', domain: 'health', industry: '临床医疗', scenario: item.scenario || '' })
      setCard(readClinicalCard(item) || emptyClinicalCard)
    }).catch((error) => toast.error(error instanceof Error ? error.message : '加载失败')).finally(() => setLoading(false))
  }, [id, user?.id])

  async function save() {
    if (!id || !original || !form.name.trim()) {
      toast.error('请填写商品名称')
      return
    }
    if (!card.population.trim() || !card.inputs.trim() || !card.output.trim() || !card.intendedUse.trim()) {
      toast.error('请填写适用人群、输入、输出和允许使用场景')
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
          companyIntroduce: encodeClinicalCard({ ...card, task: form.scenario }),
        },
      })
      toast.success('临床说明卡已保存并进入待审核状态')
      navigate('/supplier/products')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return <div className="p-6 lg:p-8 max-w-3xl">
    <button className="text-sm text-gray-500 mb-6" onClick={() => navigate('/supplier/products')}>← 返回我的临床模型</button>
    <h1 className="text-2xl font-bold text-gray-900">编辑临床模型说明卡</h1>
    <p className="text-sm text-gray-500 mt-1 mb-6">补录历史模型或更新说明。保存后需重新通过目录审核。</p>
    {loading ? <p className="text-gray-500">加载中…</p> : !original ? <p className="text-gray-500">无法编辑此商品。</p> :
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <label className="block text-sm font-semibold text-gray-700">商品名称<input value={form.name} maxLength={100} onChange={(event) => setForm({ ...form, name: event.target.value })} className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal" /></label>
        <label className="block text-sm font-semibold text-gray-700">业务描述<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={5} className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal resize-y" /></label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm font-semibold text-gray-700">领域<select value={form.domain} onChange={(event) => setForm({ ...form, domain: event.target.value })} className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal">{DOMAIN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block text-sm font-semibold text-gray-700">行业<select value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal"><option value="">未指定</option>{INDUSTRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        <label className="block text-sm font-semibold text-gray-700">业务场景<input value={form.scenario} maxLength={50} onChange={(event) => setForm({ ...form, scenario: event.target.value })} className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal" /></label>
        <div className="grid sm:grid-cols-2 gap-4">{cardFields.map(({ key, label }) => <label key={key} className="block text-sm font-semibold text-gray-700">{label}<textarea value={card[key]} onChange={(event) => setCard({ ...card, [key]: event.target.value })} rows={2} className="block w-full mt-2 border border-gray-200 rounded-xl p-3 font-normal resize-y" /></label>)}</div>
        <div className="flex gap-3"><Btn disabled={saving} onClick={() => void save()}>{saving ? '保存中…' : '保存修改'}</Btn><Btn variant="outline" onClick={() => navigate(`/supplier/trial?id=${id}`)}>试用配置</Btn></div>
      </div>}
  </div>
}
