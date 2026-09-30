export interface EvaluationRow {
  patientId: string
  outcome: 0 | 1
  score: number
  set: string
  group: string
  baselineScore?: number
}

export interface EvaluationResult {
  count: number
  positives: number
  sensitivity: number | null
  specificity: number | null
  ppv: number | null
  auroc: number | null
  auprc: number | null
  brier: number
  calibration: Array<{ range: string; predicted: number; observed: number; count: number }>
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++ }
      else quoted = !quoted
    } else if (char === ',' && !quoted) { row.push(field); field = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
    } else field += char
  }
  if (quoted) throw new Error('CSV 引号未闭合')
  row.push(field)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}

export function readEvaluationCsv(text: string): EvaluationRow[] {
  const lines = parseCsv(text.replace(/^\uFEFF/, ''))
  if (lines.length < 2) throw new Error('CSV 至少需要表头和一行数据')
  const header = lines[0].map((value) => value.trim().toLowerCase())
  const required = ['patient_id', 'outcome', 'score', 'set']
  if (required.some((key) => !header.includes(key))) throw new Error('缺少 patient_id、outcome、score 或 set 列')
  const column = (row: string[], key: string) => (row[header.indexOf(key)] || '').trim()
  const rows = lines.slice(1).map((line, index) => {
    const patientId = column(line, 'patient_id')
    const label = column(line, 'outcome')
    const scoreText = column(line, 'score')
    const set = column(line, 'set').toLowerCase()
    const score = Number(scoreText)
    if (!patientId) throw new Error(`第 ${index + 2} 行缺少患者 ID`)
    if (label !== '0' && label !== '1') throw new Error(`第 ${index + 2} 行结局标签须为 0 或 1`)
    if (!scoreText || !Number.isFinite(score) || score < 0 || score > 1) throw new Error(`第 ${index + 2} 行概率须在 0 到 1 之间`)
    if (!['train', 'test', 'external'].includes(set)) throw new Error(`第 ${index + 2} 行 set 须为 train、test 或 external`)
    const baselineText = column(line, 'baseline_score')
    const baselineScore = baselineText ? Number(baselineText) : undefined
    if (baselineText && (!Number.isFinite(baselineScore) || baselineScore! < 0 || baselineScore! > 1)) throw new Error(`第 ${index + 2} 行基线概率须在 0 到 1 之间`)
    return { patientId, outcome: Number(label) as 0 | 1, score, set, group: column(line, 'group'), baselineScore }
  })
  const patientSets = new Map<string, string>()
  for (const row of rows) {
    const previous = patientSets.get(row.patientId)
    if (previous && previous !== row.set) throw new Error(`患者 ${row.patientId} 同时出现在 ${previous} 与 ${row.set} 集合中`)
    patientSets.set(row.patientId, row.set)
  }
  return rows
}

export function evaluateRows(rows: EvaluationRow[], threshold: number): EvaluationResult {
  if (!rows.length) throw new Error('没有可评估的数据')
  const positives = rows.filter((row) => row.outcome === 1).length
  const negatives = rows.length - positives
  const tp = rows.filter((row) => row.score >= threshold && row.outcome === 1).length
  const fp = rows.filter((row) => row.score >= threshold && row.outcome === 0).length
  const tn = negatives - fp
  const sorted = [...rows].sort((a, b) => b.score - a.score)
  let seenPositive = 0
  let seenNegative = 0
  let concordant = 0
  let precisionArea = 0
  for (let i = 0; i < sorted.length;) {
    let j = i
    let groupPositive = 0
    let groupNegative = 0
    while (j < sorted.length && sorted[j].score === sorted[i].score) {
      if (sorted[j].outcome === 1) groupPositive++
      else groupNegative++
      j++
    }
    concordant += groupPositive * (negatives - seenNegative - groupNegative) + 0.5 * groupPositive * groupNegative
    seenPositive += groupPositive
    seenNegative += groupNegative
    if (positives > 0) precisionArea += (groupPositive / positives) * (seenPositive / (seenPositive + seenNegative))
    i = j
  }
  const calibration = Array.from({ length: 5 }, (_, index) => {
    const bin = rows.filter((row) => Math.min(4, Math.floor(row.score * 5)) === index)
    return {
      range: `${(index / 5).toFixed(1)}–${((index + 1) / 5).toFixed(1)}`,
      predicted: bin.length ? bin.reduce((sum, row) => sum + row.score, 0) / bin.length : 0,
      observed: bin.length ? bin.filter((row) => row.outcome === 1).length / bin.length : 0,
      count: bin.length,
    }
  })
  return {
    count: rows.length, positives,
    sensitivity: positives ? tp / positives : null,
    specificity: negatives ? tn / negatives : null,
    ppv: tp + fp ? tp / (tp + fp) : null,
    auroc: positives && negatives ? concordant / (positives * negatives) : null,
    auprc: positives ? precisionArea : null,
    brier: rows.reduce((sum, row) => sum + (row.score - row.outcome) ** 2, 0) / rows.length,
    calibration,
  }
}
