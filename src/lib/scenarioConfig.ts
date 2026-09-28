export const DEFAULT_ALGORITHM_CATEGORIES = [
  { code: 'classification', text: '分类' },
  { code: 'detection', text: '检测' },
  { code: 'regression', text: '回归/预测' },
  { code: 'clustering', text: '聚类' },
  { code: 'generation', text: '生成' },
  { code: 'recommendation', text: '推荐' },
]

export const PROGRESS_STEPS = [
  { step: 1, title: '理解需求和应用场景' },
  { step: 2, title: '强化算法方案' },
  { step: 3, title: '生成算法模型源文件' },
  { step: 4, title: '检查结果完整性' },
  { step: 5, title: '整理说明与源文件' },
]

/** 简化版类别参数（不依赖全量字典时也能用） */
export const CATEGORY_PARAM_HINTS: Record<string, string> = {
  classification: '适合标签分类、风险等级判定等场景',
  detection: '适合异常检测、目标检测、欺诈识别等',
  regression: '适合数值预测、销量/流失概率预测等',
  clustering: '适合客群分群、无监督归类等',
  generation: '适合报告生成、文本/内容生成等',
  recommendation: '适合商品/内容推荐、排序等',
}

export function mapAgentStepToFriendly(agentStepCount: number): { step: number; message: string } {
  if (agentStepCount <= 1) return { step: 1, message: '正在理解您的业务需求…' }
  if (agentStepCount <= 3) return { step: 2, message: '正在设计算法方案…' }
  if (agentStepCount <= 6) return { step: 3, message: '正在生成算法源码…' }
  if (agentStepCount <= 8) return { step: 4, message: '正在检查结果完整性…' }
  return { step: 5, message: '正在整理说明与源文件…' }
}
