import { resultLabels, resultText, summarizeClinicalResult } from '@/lib/clinicalResult'

export function ClinicalResultSummary({ value, description }: { value: unknown; description?: string }) {
  const summary = summarizeClinicalResult(value)
  return <div className="cw-result-summary">
    {summary.blocked ? <p role="alert" className="cw-result-warning">本次未得到可用结果，请检查输入和下方提示。</p>
      : summary.primary.length ? <dl className="cw-result-primary">{summary.primary.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
        : <p className="text-sm my-4">模型返回了 {summary.entries.length} 项内容，请展开“详细结果”查看。</p>}
    {summary.hasProbability && <p className="text-xs text-gray-500">按本次输入计算；百分比为简化显示，原始精度保留在详细结果中。</p>}
    {summary.notes.length > 0 && <div className="cw-result-reading"><h4>如何理解</h4><ul>{summary.notes.slice(0, 3).map((note, index) => <li key={index}>{note}</li>)}</ul>{summary.notes.length > 3 && <p className="text-xs text-gray-500 mt-2">用途与适用范围见下方“完整结果解释”。</p>}</div>}
    {!summary.notes.length && summary.reason && <p className="text-sm leading-7 my-4">{summary.reason}</p>}
    {summary.errors.map((message, index) => <p role="alert" className="cw-result-warning" key={'error-' + index}>{message}</p>)}
    {summary.warnings.map((message, index) => <p role="status" className="cw-result-warning" key={'warning-' + index}>{message}</p>)}
    {(summary.pending > 0 || summary.limitations > 0) && <p className="cw-result-warning">{summary.pending > 0 ? `有 ${summary.pending} 项复现细节待核对。` : ''}{summary.limitations > 0 ? `模型列有 ${summary.limitations} 项使用与复现限制。` : ''}请在下方详情中查看；计算完成不代表复现已验证通过。</p>}
    <details className="cw-disclosure cw-result-details"><summary>详细结果与复现说明</summary>
      {description && <details className="cw-disclosure"><summary>输出字段说明</summary><p className="text-sm leading-7">{description}</p></details>}
      {summary.entries.map(([key, item]) => <details className="cw-disclosure" key={key}><summary>{Object.prototype.hasOwnProperty.call(resultLabels, key) ? resultLabels[key] : key}</summary>{Array.isArray(item) ? <ul className="cw-result-list">{item.map((entry, index) => <li key={index}>{resultText(entry)}</li>)}</ul> : <p className="cw-result-detail-text">{resultText(item)}</p>}</details>)}
    </details>
  </div>
}
