import { useState } from 'react'
import { evaluateRows, readEvaluationCsv, type EvaluationRow } from '@/lib/clinicalEvaluation'

const pct = (value: number | null) => value === null ? '无法计算' : `${(value * 100).toFixed(1)}%`

export function ClinicalEvaluationPage() {
  const [rows, setRows] = useState<EvaluationRow[]>([])
  const [threshold, setThreshold] = useState(0.5)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const sets = ['test', 'external'] as const
  const reports = sets.map((set) => {
    const subset = rows.filter((row) => row.set === set)
    return { set, result: subset.length ? evaluateRows(subset, threshold) : null }
  })
  const groups = [...new Set(rows.filter((row) => row.set === 'test' && row.group).map((row) => row.group))]

  async function load(file: File | undefined) {
    if (!file) return
    setRows([])
    setError('')
    try {
      const parsed = readEvaluationCsv(await file.text())
      if (!parsed.some((row) => row.set === 'test' || row.set === 'external')) throw new Error('至少需要 test 或 external 验证集')
      setRows(parsed)
      setFileName(file.name)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'CSV 读取失败')
    }
  }

  return <div className="max-w-5xl p-6 lg:p-8 space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">结构化临床模型评估</h1>
      <p className="text-sm text-gray-500 mt-2">在浏览器本地计算二分类风险预测指标。结果只反映上传的验证数据，不代表临床认证。</p></div>
    <section className="bg-white border rounded-2xl p-6 space-y-4">
      <h2 className="font-semibold">导入验证数据</h2>
      <p className="text-sm text-gray-600">CSV 必须包含 <code>patient_id,outcome,score,set</code>；可选 <code>group,baseline_score</code>。结局为 0/1，score 和基线模型分数均为 0–1 的预测概率，set 为 train、test 或 external。每位患者只能属于一个集合。</p>
      <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">请使用去标识化患者 ID。文件在当前浏览器内处理，不会由此页面上传到服务器。请核对预测时点、计量单位、异常值和标签定义。</p>
      <input aria-label="选择评估 CSV" type="file" accept=".csv,text/csv" onChange={(event) => void load(event.target.files?.[0])} className="text-sm" />
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      {rows.length > 0 && <p className="text-sm text-green-700">已读取 {fileName}，共 {rows.length} 条记录、{new Set(rows.map((row) => row.patientId)).size} 位患者。</p>}
      <label className="block text-sm">分类阈值：{threshold.toFixed(2)}<input type="range" min="0.05" max="0.95" step="0.05" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} className="block w-full max-w-sm mt-2" /></label>
    </section>
    {reports.map(({ set, result }) => result && <section key={set} className="bg-white border rounded-2xl p-6">
      <h2 className="font-semibold mb-2">{set === 'external' ? '外部验证集' : '测试集'} · {result.count} 条记录</h2>
      <p className="text-xs text-gray-500 mb-4">阳性 {result.positives} 例；阈值 {threshold.toFixed(2)}。如同一患者有多条记录，请先按研究方案汇总。</p>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {([['敏感度', pct(result.sensitivity)], ['特异度', pct(result.specificity)], ['阳性预测值', pct(result.ppv)], ['AUROC', result.auroc?.toFixed(3) ?? '无法计算'], ['AUPRC', result.auprc?.toFixed(3) ?? '无法计算'], ['Brier 分数', result.brier.toFixed(3)]] as const).map(([label, value]) => <div key={label} className="bg-gray-50 rounded-lg p-3"><dt className="text-gray-500">{label}</dt><dd className="font-semibold mt-1">{value}</dd></div>)}
      </dl>
      {rows.filter((row) => row.set === set).every((row) => row.baselineScore !== undefined) && <p className="text-sm mt-4 bg-blue-50 rounded-lg p-3">基线模型 AUROC：{evaluateRows(rows.filter((row) => row.set === set).map((row) => ({ ...row, score: row.baselineScore! })), threshold).auroc?.toFixed(3) ?? '无法计算'}。请在正式报告中说明基线模型及其适用性。</p>}
      <h3 className="font-medium mt-5 mb-2">校准分组</h3>
      <div className="grid sm:grid-cols-5 gap-2 text-xs">{result.calibration.map((bin) => <div key={bin.range} className="border rounded-lg p-3"><b>{bin.range}</b><p>样本 {bin.count}</p><p>平均预测 {pct(bin.predicted)}</p><p>实际发生 {bin.count ? pct(bin.observed) : '无样本'}</p></div>)}</div>
    </section>)}
    {groups.length > 0 && <section className="bg-white border rounded-2xl p-6"><h2 className="font-semibold mb-3">测试集亚组</h2>
      <div className="space-y-2 text-sm">{groups.map((group) => { const result = evaluateRows(rows.filter((row) => row.set === 'test' && row.group === group), threshold); return <p key={group} className="border-b pb-2">{group}：{result.count} 条，阳性 {result.positives} 例，AUROC {result.auroc?.toFixed(3) ?? '无法计算'}，敏感度 {pct(result.sensitivity)}</p> })}</div>
      <p className="text-xs text-gray-500 mt-3">小样本亚组结果波动较大；本页尚未计算置信区间。</p>
    </section>}
    {rows.length > 0 && <p className="text-xs text-gray-500">报告需补充研究设计、时间划分、外部数据来源、置信区间和临床效用后，才能用于正式研究报告。</p>}
  </div>
}
