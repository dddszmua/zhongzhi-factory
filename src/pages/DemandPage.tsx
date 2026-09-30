import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import { Btn } from '@/components/ui/Btn'

const fields = [
  ['population', '目标患者与纳入条件', '例如：18 岁以上的住院患者'],
  ['exclusions', '排除条件', '例如：入院前已有该结局的患者'],
  ['timepoint', '模型使用时点', '例如：入院后 24 小时'],
  ['availableData', '该时点已能获得的数据', '例如：入院时生命体征和首次检验结果'],
  ['outcome', '预测或识别的结局', '例如：30 天内再入院'],
  ['horizon', '观察时间范围', '例如：出院后 30 天'],
  ['decision', '使用者与支持的决定', '例如：研究人员用于回顾性风险分层'],
  ['evidence', '已有数据、基线模型或研究依据', '例如：单中心历史队列和现有临床评分'],
] as const

type Key = typeof fields[number][0]
type Form = Record<Key, string>
const initial = Object.fromEntries(fields.map(([key]) => [key, ''])) as Form

export function DemandPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>(initial)

  function find() {
    if (!form.population.trim() || !form.timepoint.trim() || !form.availableData.trim() || !form.outcome.trim()) {
      toast.error('请至少填写目标患者、使用时点、可用数据和结局')
      return
    }
    const query = `${form.population}，在${form.timepoint}使用${form.availableData}，预测或识别${form.outcome}，观察${form.horizon || '指定时间范围'}`
    navigate(`/market?q=${encodeURIComponent(query)}`)
  }

  return <div className="min-h-screen bg-[#f8f9fc]">
    <NavBar />
    <main className="max-w-3xl mx-auto px-6 pt-28 pb-20 min-h-[75vh]">
      <h1 className="text-3xl font-bold text-gray-900">描述临床研究问题</h1>
      <p className="text-sm text-gray-500 mt-2 mb-7">明确目标患者、预测时点和当时可获得的数据，再查找匹配模型。</p>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        {fields.map(([key, label, placeholder]) => <label key={key} className="block text-sm font-semibold text-gray-700">
          {label}{(['population', 'timepoint', 'availableData', 'outcome'] as Key[]).includes(key) && <span className="text-red-500"> *</span>}
          <textarea value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} maxLength={500} rows={2} placeholder={placeholder} className="block w-full mt-2 border border-gray-200 rounded-xl p-3 font-normal resize-y" />
        </label>)}
        <p className="bg-amber-50 text-amber-800 rounded-xl p-3 text-xs">请只填写字段结构和数据摘要，不要输入姓名、病历原文等可识别患者的信息。预测时点之后才产生的数据不能作为模型输入。</p>
        <div className="flex items-center gap-4"><Btn onClick={find}>查找匹配模型</Btn><Link to="/market" className="text-sm text-blue-600">直接浏览目录</Link></div>
      </div>
      <p className="text-xs text-gray-400 mt-5">本页只用于检索现有目录，不会自动生成或验证临床模型。</p>
    </main>
    <Footer />
  </div>
}
