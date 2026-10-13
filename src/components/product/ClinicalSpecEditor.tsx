import type { ClinicalAlgorithmArtifact, ClinicalParameter } from '@/api/services'

type Spec = ClinicalAlgorithmArtifact['spec']
type Field = Spec['inputs'][number]

export function ClinicalSpecEditor({ spec, parameters, samples, onSpecChange, onSamplesChange }: {
  spec: Spec
  parameters: ClinicalParameter[]
  samples: Record<string, string>
  onSpecChange: (spec: Spec) => void
  onSamplesChange: (samples: Record<string, string>) => void
}) {
  function changeField(index: number, patch: Partial<Field>) {
    onSpecChange({ ...spec, inputs: spec.inputs.map((field, i) => i === index ? { ...field, ...patch } : field) })
  }

  function loadParameters() {
    const previous = new Map(spec.inputs.map((field) => [field.name, field]))
    onSpecChange({ ...spec, inputs: parameters.map((parameter) => previous.get(parameter.name) || {
      name: parameter.name, label: parameter.name, type: 'number', required: parameter.required,
    }) })
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-gray-500">字段顺序必须与 Python main_process 参数一致。修改后请重新验证当前版本。</p>
      <button type="button" onClick={loadParameters} disabled={!parameters.length} className="text-sm text-blue-600 disabled:opacity-50">从源码读取参数</button>
    </div>
    <label className="block text-sm">规范标题<input className="block w-full border rounded-xl p-2 mt-1" value={spec.title || ''} onChange={(event) => onSpecChange({ ...spec, title: event.target.value })} /></label>
    {spec.inputs.map((field, index) => <div key={`${index}-${field.name}`} className="border rounded-xl p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Python 参数名<input className="block w-full border rounded-lg p-2 mt-1 font-mono" value={field.name} onChange={(event) => changeField(index, { name: event.target.value })} /></label>
        <label className="text-sm">显示名称<input className="block w-full border rounded-lg p-2 mt-1" value={field.label || ''} onChange={(event) => changeField(index, { label: event.target.value })} /></label>
        <label className="text-sm">类型<select className="block w-full border rounded-lg p-2 mt-1" value={field.type} onChange={(event) => changeField(index, { type: event.target.value as Field['type'] })}><option value="number">数值</option><option value="integer">整数</option><option value="string">文本</option><option value="boolean">布尔值</option></select></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-sm">单位<input className="block w-full border rounded-lg p-2 mt-1" value={field.unit || ''} onChange={(event) => changeField(index, { unit: event.target.value })} /></label>
        <label className="text-sm">最小值<input type="number" className="block w-full border rounded-lg p-2 mt-1" value={field.minimum ?? ''} disabled={field.type !== 'number' && field.type !== 'integer'} onChange={(event) => changeField(index, { minimum: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
        <label className="text-sm">最大值<input type="number" className="block w-full border rounded-lg p-2 mt-1" value={field.maximum ?? ''} disabled={field.type !== 'number' && field.type !== 'integer'} onChange={(event) => changeField(index, { maximum: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
        <label className="text-sm">合成样例<input className="block w-full border rounded-lg p-2 mt-1" value={samples[field.name] ?? ''} onChange={(event) => onSamplesChange({ ...samples, [field.name]: event.target.value })} /></label>
      </div>
      <div className="flex flex-wrap gap-4 items-center">
        <label className="text-sm"><input type="checkbox" checked={field.required !== false} onChange={(event) => changeField(index, { required: event.target.checked })} /> 必填</label>
        {field.type === 'string' && <label className="text-sm flex-1">选项（每行一个）<textarea className="block w-full border rounded-lg p-2 mt-1" rows={2} value={(field.options || []).join('\n')} onChange={(event) => changeField(index, { options: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) })} /></label>}
      </div>
      <label className="text-sm block">填写提示<input className="block w-full border rounded-lg p-2 mt-1" value={field.description || ''} onChange={(event) => changeField(index, { description: event.target.value })} /></label>
    </div>)}
    {!spec.inputs.length && <p className="text-sm text-amber-700">请先从源码读取参数，再设置每个参数的类型与合成样例。</p>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">输出类型<select className="block w-full border rounded-xl p-2 mt-1" value={spec.output?.type || ''} onChange={(event) => onSpecChange({ ...spec, output: { ...spec.output, type: event.target.value as NonNullable<Spec['output']>['type'] } })}><option value="">暂不约束</option><option value="number">数值</option><option value="integer">整数</option><option value="string">文本</option><option value="boolean">布尔值</option><option value="object">对象</option><option value="array">数组</option></select></label><label className="block text-sm">输出含义<input className="block w-full border rounded-xl p-2 mt-1" value={spec.output?.description || ''} onChange={(event) => onSpecChange({ ...spec, output: { ...spec.output, description: event.target.value } })} /></label></div>
  </div>
}
