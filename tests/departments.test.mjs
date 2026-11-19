import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText
const clinicalUrl = 'data:text/javascript,' + encodeURIComponent(compile('../src/lib/clinical.ts'))
const compiled = compile('../src/lib/departments.ts').replace("'./clinical'", JSON.stringify(clinicalUrl))
const { departments, matchesDepartment } = await import('data:text/javascript,' + encodeURIComponent(compiled))
const product = card => ({ raw: { source: { companyIntroduce: 'ZZF_CLINICAL_V1:' + JSON.stringify(card) } } })

test('department IDs agree with the server paper catalog and every department has a reference', () => {
  const catalog = JSON.parse(readFileSync(new URL('../../ioeb_backend/app/resources/clinical_catalog/catalog.json', import.meta.url), 'utf8'))
  assert.deepEqual(departments.slice(1).map(({ id, name }) => ({ id, name })), catalog.departments)
  for (const d of catalog.departments) assert.ok(catalog.papers.some(p => p.departmentIds.includes(d.id)))
})

test('explicit assignment overrides old specialty text and supports cross-department models', () => {
  const p = product({ specialty: '肾内科', departmentIds: ['emergency', 'respiratory'] })
  assert.equal(matchesDepartment(p, '急诊与重症'), true)
  assert.equal(matchesDepartment(p, 'respiratory'), true)
  assert.equal(matchesDepartment(p, '肾内科'), false)
})

test('old models keep their specialty mapping, unclassified models remain visible in all departments', () => {
  assert.equal(matchesDepartment(product({ specialty: '肾脏病学与检验医学' }), 'nephrology'), true)
  assert.equal(matchesDepartment(product({}), 'all'), true)
  assert.equal(matchesDepartment(product({}), '呼吸内科'), false)
})
