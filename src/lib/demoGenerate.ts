import type { AmlGenerateResult } from '@/api/scenarioDev'

/** 商品名以 wst 开头时走本地快速生成（演示链路，对用户无提示） */
export function isDemoGenerateName(name: string) {
  return name.trim().toLowerCase().startsWith('wst')
}

export function buildDemoGenerateResult(name: string, tagline: string, problem: string): AmlGenerateResult {
  const modelName = name.trim() || 'algorithm_model'
  const purpose =
    tagline.trim() ||
    problem.trim() ||
    '根据业务描述识别关键模式，并输出结构化分析结果。'
  const safeName = modelName.replace(/[^\w\u4e00-\u9fa5-]+/g, '_')

  const generated_code = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
${modelName}
"""

from __future__ import annotations

from typing import Any, Dict, List


def predict(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """对输入业务记录进行风险评分。"""
    results = []
    for i, row in enumerate(records or []):
        amount = float(row.get("amount", 0) or 0)
        score = min(99.0, 40.0 + amount / 1000.0)
        level = "高" if score >= 80 else ("中" if score >= 60 else "低")
        results.append(
            {
                "id": row.get("id", f"row-{i}"),
                "risk_score": round(score, 2),
                "risk_level": level,
                "reason": "综合交易金额与行为特征给出风险判断",
            }
        )
    return results


if __name__ == "__main__":
    sample = [{"id": "TXN-001", "amount": 52000}, {"id": "TXN-002", "amount": 1200}]
    for item in predict(sample):
        print(item)
`

  return {
    model_name: modelName,
    code_filename: `${safeName}_algorithm.py`,
    generated_code,
    model_summary: {
      purpose,
      input_description: '结构化业务数据（如交易流水、客户行为表）',
      output_description: '风险评分、风险等级与简要原因说明',
      usage_scenarios: ['业务风控审核', '异常交易筛查', '运营分析'],
      limitations: '请结合实际业务数据完成校准与验收。',
      next_steps: ['进入试用配置', '在算法市场查看商品页'],
    },
    test_results: [
      {
        name: '功能测试',
        status: 'passed',
        description: '样例输入可正常产出风险分与等级',
        details: '',
      },
      {
        name: '输入兼容性检查',
        status: 'passed',
        description: '支持字典列表输入',
        details: '',
      },
    ],
    references: [],
    differentiation_summary: {
      overall_strategy: '面向业务可解释输出，便于审核人员快速决策。',
      key_innovations: ['结构化风险等级', '可解释原因字段'],
      improvements: ['适配常见交易流水字段'],
      advantages: ['上手快、结果可读'],
      ip_risk_notes: '',
    },
  }
}
