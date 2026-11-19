export function resultText(value: unknown): string {
  if (value === null || value === undefined) return '未提供'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

function messages(value: unknown): string[] {
  if (value == null || value === '' || value === false) return []
  if (Array.isArray(value)) return value.flatMap(messages)
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}：${resultText(item)}`)
  return [String(value)]
}

export function summarizeClinicalResult(value: unknown) {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  const errors = messages(data?.errors ?? data?.error)
  const warnings = messages(data?.warnings ?? data?.warning)
  const blocked = data?.calculated === false || errors.length > 0
  const probability = data?.predicted_probability
  // Only an explicit probability field is formatted as a percentage. A generic score,
  // prediction or confidence field does not establish a probability's meaning.
  const hasProbability = !blocked && typeof probability === 'number' && Number.isFinite(probability) && probability >= 0 && probability <= 1
  const primary: Array<{ label: string; value: string }> = []
  if (hasProbability) {
    const percent = probability * 100
    primary.push({ label: '模型估计概率', value: percent > 0 && percent < 0.01 ? '< 0.01%' : percent < 100 && percent > 99.99 ? '> 99.99%' : `${percent.toFixed(2)}%` })
  } else if (!blocked) {
    if (!data && !Array.isArray(value)) primary.push({ label: '计算结果', value: resultText(value) })
    else if (data) {
      const labels: Record<string, string> = { prediction: '模型输出', score: '模型评分', result: '计算结果', value: '计算值', bmi: 'BMI' }
      for (const [key, label] of Object.entries(labels)) {
        const item = data[key]
        if (typeof item === 'number' && Number.isFinite(item) || typeof item === 'string' && item.length <= 80 || typeof item === 'boolean') primary.push({ label, value: resultText(item) })
      }
    }
  }
  // Use the model's own section headings, never invent clinical conclusions.
  const notes = messages(data?.interpretation_notes).map(text => {
    const separator = text.indexOf('：')
    return separator > 0 && separator < 65 && /^(输出不是|输出不含)/.test(text) ? text.slice(0, separator) : text
  })
  return {
    primary, hasProbability, blocked, errors, warnings, notes,
    reason: typeof data?.reason === 'string' ? data.reason : '',
    pending: Array.isArray(data?.pending_verification_items) ? data.pending_verification_items.length : 0,
    limitations: Array.isArray(data?.reproduction_limitations) ? data.reproduction_limitations.length : 0,
    entries: data ? Object.entries(data) : [['计算结果', value] as [string, unknown]],
  }
}

export const resultLabels: Record<string, string> = {
  model_name: '模型名称', model_source: '文献来源', model_type: '模型方法', formula: '计算公式',
  model_coefficients: '回归系数', odds_ratio_recheck: '系数与比值比核对', paper_reported_metrics: '论文报告的评估指标（非本次重算）',
  unreproducible_components: '暂无法复现的部分', inputs_used: '实际采用的输入', is_score_reference_range: '量表参考范围',
  study_population: '研究人群', reproduction_limitations: '复现限制', pending_verification_items: '待核对事项',
  interpretation_notes: '完整结果解释', prediction: '模型输出', predicted_probability: '模型估计概率（原始值）',
  predicted_probability_rounded: '模型估计概率（舍入值）', linear_predictor: '线性预测值', odds: '概率对应的 odds',
  coefficient_contributions: '各项计算贡献', calculation_steps: '计算步骤', calculated: '是否完成计算',
  confidence: '程序返回的 confidence（非临床可信度）', status: '程序状态', reason: '计算说明',
  paper_example_consistency: '论文示例一致性核对', warnings: '运行提醒', errors: '运行错误',
}
