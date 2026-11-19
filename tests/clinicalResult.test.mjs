import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/clinicalResult.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { summarizeClinicalResult } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`)

test('shows one explicit probability and retains duplicate values and evidence in details', () => {
  const result = summarizeClinicalResult({ prediction: 0.15603904069151753, predicted_probability: 0.15603904069151753, predicted_probability_rounded: 0.156039, confidence: 1, model_coefficients: { intercept: -6.862 }, pending_verification_items: ['编码需核对'] })
  assert.deepEqual(result.primary, [{ label: '模型估计概率', value: '15.60%' }])
  assert.equal(result.pending, 1)
  assert.equal(result.entries.length, 6)
})

test('does not interpret scores or confidence as probabilities', () => {
  assert.equal(summarizeClinicalResult({ score: 0.7, confidence: 1 }).primary[0].value, '0.7')
  assert.deepEqual(summarizeClinicalResult({ confidence: 1 }).primary, [])
  assert.equal(summarizeClinicalResult({ predicted_probability: 15.6 }).hasProbability, false)
  assert.equal(summarizeClinicalResult({ predicted_probability: '0.15' }).hasProbability, false)
})

test('errors suppress numeric highlights, warnings and incomplete reproduction remain visible', () => {
  const result = summarizeClinicalResult({ predicted_probability: 0.1, errors: ['缺少输入'], warnings: ['超出样本范围'], reproduction_limitations: ['无外部验证'] })
  assert.deepEqual(result.primary, [])
  assert.equal(result.blocked, true)
  assert.deepEqual(result.errors, ['缺少输入'])
  assert.deepEqual(result.warnings, ['超出样本范围'])
  assert.equal(result.limitations, 1)
  assert.equal(summarizeClinicalResult({ calculated: false, predicted_probability: 0.1 }).blocked, true)
})

test('rounding does not turn small nonzero or near-one probabilities into certainty', () => {
  assert.equal(summarizeClinicalResult({ predicted_probability: 0.000001 }).primary[0].value, '< 0.01%')
  assert.equal(summarizeClinicalResult({ predicted_probability: 0.999999 }).primary[0].value, '> 99.99%')
})

test('preserves important notes and unknown output', () => {
  const result = summarizeClinicalResult({ unusual_result: { value: 3 }, interpretation_notes: ['输出不是感染诊断：仍需检测。', '允许用途：教学与研发核对。'] })
  assert.deepEqual(result.notes, ['输出不是感染诊断', '允许用途：教学与研发核对。'])
  assert.equal(result.entries[0][0], 'unusual_result')
  assert.deepEqual(result.primary, [])
})
