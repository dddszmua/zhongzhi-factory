import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import { Btn } from '@/components/ui/Btn'
import { DOMAIN_OPTIONS } from '@/lib/constants'

export function DemandPage() {
  const navigate = useNavigate()
  const [domain, setDomain] = useState('')
  const [problem, setProblem] = useState('')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')

  function find() {
    if (!problem.trim()) {
      toast.error('请先描述要解决的业务问题')
      return
    }
    const query = [problem.trim(), input.trim() && `输入：${input.trim()}`, output.trim() && `期望输出：${output.trim()}`].filter(Boolean).join('；')
    const params = new URLSearchParams({ q: query })
    if (domain) params.set('domain', domain)
    navigate(`/market?${params.toString()}`)
  }

  return <div className="min-h-screen bg-[#f8f9fc]">
    <NavBar />
    <main className="max-w-3xl mx-auto px-6 pt-28 pb-20 min-h-[75vh]">
      <h1 className="text-3xl font-bold text-gray-900">描述需求，寻找算法</h1>
      <p className="text-sm text-gray-500 mt-2 mb-7">按业务问题、已有数据和预期结果填写，我们会用这些信息检索算法市场。</p>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <label className="block text-sm font-semibold text-gray-700">应用领域
          <select value={domain} onChange={(event) => setDomain(event.target.value)} className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal">
            <option value="">暂不确定</option>{DOMAIN_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold text-gray-700">要解决什么问题？ <span className="text-red-500">*</span>
          <textarea value={problem} onChange={(event) => setProblem(event.target.value)} maxLength={1000} rows={4} placeholder="例如：根据历史订单识别可能流失的客户" className="block w-full mt-2 border border-gray-200 rounded-xl p-3 font-normal resize-y" />
        </label>
        <label className="block text-sm font-semibold text-gray-700">已有数据或输入格式
          <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={200} placeholder="例如：CSV 表格，包含客户行为记录" className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal" />
        </label>
        <label className="block text-sm font-semibold text-gray-700">期望得到什么结果？
          <input value={output} onChange={(event) => setOutput(event.target.value)} maxLength={200} placeholder="例如：每位客户的流失风险评分" className="block w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 font-normal" />
        </label>
        <div className="flex items-center gap-4"><Btn onClick={find}>查找匹配算法</Btn><Link to="/market" className="text-sm text-blue-600">直接浏览市场</Link></div>
      </div>
      <p className="text-xs text-gray-400 mt-5">找到算法后，可在商品详情中咨询供应商。填写内容只用于本次市场检索。</p>
    </main>
    <Footer />
  </div>
}
