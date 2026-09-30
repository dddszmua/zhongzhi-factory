import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/lib/clinicalEvaluation.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { evaluateRows, readEvaluationCsv } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`)

test('calculates metrics from an independent test set', () => {
  const rows = readEvaluationCsv('patient_id,outcome,score,set,baseline_score\nA,1,0.9,test,0.6\nB,0,0.1,test,0.4\nC,1,0.8,test,0.5\nD,0,0.2,test,0.3')
  const result = evaluateRows(rows, 0.5)
  assert.equal(result.auroc, 1)
  assert.equal(result.auprc, 1)
  assert.equal(result.sensitivity, 1)
  assert.equal(result.specificity, 1)
  assert.equal(result.ppv, 1)
  assert.ok(result.brier > 0)
})

test('rejects patient leakage across data sets', () => {
  assert.throws(() => readEvaluationCsv('patient_id,outcome,score,set\nA,1,0.9,train\nA,1,0.8,test'), /同时出现在/)
})

test('rejects invalid outcomes and probabilities', () => {
  assert.throws(() => readEvaluationCsv('patient_id,outcome,score,set\nA,2,0.9,test'), /结局标签/)
  assert.throws(() => readEvaluationCsv('patient_id,outcome,score,set\nA,1,1.2,test'), /概率/)
})

test('handles tied scores without overstating discrimination', () => {
  const rows = readEvaluationCsv('patient_id,outcome,score,set\nA,1,0.5,test\nB,0,0.5,test')
  assert.equal(evaluateRows(rows, 0.5).auroc, 0.5)
})
