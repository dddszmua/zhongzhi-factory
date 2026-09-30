import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { getMyAlgorithmModels } from '@/api/services'
import {
  cancelMcpJob, checkMcpJob, createMcpJob, deployMcpJob, downloadMcpArtifact, getMcpJob,
  packageMcpJob, saveMcpSpec, submitMcpReview, suggestMcpIntent, uploadMcpSource, type McpJob, type McpTool,
} from '@/api/mcpPackaging'
import type { BackendService } from '@/lib/mappers'
import { isClinicalDomain, readClinicalCard } from '@/lib/clinical'

const steps = ['选择源码', '填写想定', '确认工具', '生成封装', '部署验证']

function suggestedTool(entrypoint: string, name: string, description: string, parameters: string[]): McpTool {
  return {
    entrypoint, name, description,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(parameters.map((param) => [param, { type: 'string', description: '请核对参数类型' }])),
      required: parameters,
    },
  }
}

export function McpPackagingPage() {
  const navigate = useNavigate()
  const { jobId } = useParams()
  const [query] = useSearchParams()
  const initialSource = query.get('sourceServiceId') || undefined
  const created = useRef(false)
  const { user } = useAuth()
  const [job, setJob] = useState<McpJob | null>(null)
  const [algorithms, setAlgorithms] = useState<BackendService[]>([])
  const [chosenAlgorithm, setChosenAlgorithm] = useState('')
  const [name, setName] = useState('')
  const [scenario, setScenario] = useState('')
  const [targetUsers, setTargetUsers] = useState('')
  const [intentMessage, setIntentMessage] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [tools, setTools] = useState<McpTool[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [schemaError, setSchemaError] = useState('')
  const [activeStep, setActiveStep] = useState(0)
  const [testTool, setTestTool] = useState('')
  const [argumentsJson, setArgumentsJson] = useState('{}')
  const [callResult, setCallResult] = useState<unknown>(null)

  const sync = (value: McpJob) => {
    setJob(value)
    setName(value.spec.service_name || '')
    setScenario(value.spec.scenario || '')
    setTargetUsers((value.spec.target_users || []).join('、'))
    setTools(value.spec.tools || [])
    if (value.status === 'packaging' || value.status === 'packaged') setActiveStep(3)
    if (value.serviceId) setActiveStep(4)
  }

  useEffect(() => {
    if (jobId) {
      getMcpJob(jobId).then(sync).catch((cause) => setError(cause instanceof Error ? cause.message : '读取任务失败'))
      return
    }
    if (!initialSource || created.current || !user?.id) return
    created.current = true
    getMyAlgorithmModels(user.id).then((items) => {
      if (!items.some((item) => item.id === initialSource && isClinicalDomain(item) && readClinicalCard(item))) throw new Error('请先为该模型补全临床说明卡')
      return createMcpJob(initialSource)
    }).then((value) => navigate(`/supplier/mcp/jobs/${value.id}`, { replace: true }))
      .catch((cause) => setError(cause instanceof Error ? cause.message : '无法使用该算法'))
  }, [jobId, initialSource, navigate, user?.id])

  useEffect(() => {
    if (!user?.id) return
    getMyAlgorithmModels(user.id, user.username).then((items) => setAlgorithms(items.filter((item) => item.status !== 'draft' && isClinicalDomain(item) && readClinicalCard(item)))).catch(() => setAlgorithms([]))
  }, [user?.id, user?.username])

  useEffect(() => {
    if (!jobId || !job || (job.status !== 'packaging' && job.status !== 'cancelling' && job.status !== 'deploying' && job.serviceStatus !== 'deploying')) return
    const timer = setInterval(() => {
      getMcpJob(jobId).then((value) => {
        setJob(value)
        if (value.status === 'failed') setError(value.error || '封装失败')
      }).catch(() => {})
    }, 3000)
    return () => clearInterval(timer)
  }, [jobId, job?.status, job?.serviceStatus])

  const perform = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败') }
    finally { setBusy(false) }
  }

  const selectAlgorithm = () => perform(async () => {
    if (!chosenAlgorithm) throw new Error('请选择自己的算法')
    const value = await createMcpJob(chosenAlgorithm)
    navigate(`/supplier/mcp/jobs/${value.id}`)
  })

  const upload = (file?: File) => perform(async () => {
    if (!file) return
    if (!['.py', '.zip'].some((extension) => file.name.toLowerCase().endsWith(extension))) throw new Error('仅支持 .py 或 .zip')
    if (file.size > 15 * 1024 * 1024) throw new Error('源码文件不能超过 15 MB')
    const value = job || await createMcpJob()
    const updated = await uploadMcpSource(value.id, file)
    sync(updated)
    setActiveStep(1)
    if (!jobId) navigate(`/supplier/mcp/jobs/${updated.id}`, { replace: true })
  })

  const toggle = (candidate: McpJob['candidates'][number]) => {
    if (job?.artifactReady || job?.serviceId) return
    setTools((current) => current.some((tool) => tool.entrypoint === candidate.entrypoint)
      ? current.filter((tool) => tool.entrypoint !== candidate.entrypoint)
      : [...current, suggestedTool(candidate.entrypoint, candidate.name, candidate.description, candidate.parameters)])
  }

  const save = () => perform(async () => {
    if (!job) throw new Error('请先选择源码')
    if (!name.trim() || !scenario.trim()) throw new Error('请填写服务名称和使用场景')
    if (!tools.length) throw new Error('至少确认一个工具')
    if (schemaError) throw new Error(schemaError)
    for (const tool of tools) {
      const properties = tool.input_schema.properties
      if (!properties || typeof properties !== 'object' || Array.isArray(properties)) throw new Error(`${tool.name} 缺少输入字段规范`)
      for (const [field, value] of Object.entries(properties)) {
        const spec = value as Record<string, unknown>
        if (!spec?.type || !spec?.description || String(spec.description).includes('请核对参数类型')) {
          throw new Error(`${tool.name} 的 ${field} 需要明确类型和医学含义`)
        }
        if (spec.type === 'number' && !spec.unit) throw new Error(`${tool.name} 的 ${field} 需要在 Schema 中注明 unit`)
      }
    }
    const value = await saveMcpSpec(job.id, job.revision, {
      service_name: name.trim(), scenario: scenario.trim(),
      target_users: targetUsers.split(/[、,，]/).map((text) => text.trim()).filter(Boolean),
      source_digest: job.sourceDigest, transport: 'sse', tools,
    })
    sync(value)
    setActiveStep(3)
    toast.success('封装想定已保存')
  })

  const suggest = () => perform(async () => {
    if (!job || !intentMessage.trim()) throw new Error('请先描述服务用途')
    const result = await suggestMcpIntent(job.id, intentMessage, {
      service_name: name, scenario, target_users: targetUsers.split(/[、,，]/).filter(Boolean),
    })
    if (result.updates.service_name) setName(result.updates.service_name)
    if (result.updates.scenario) setScenario(result.updates.scenario)
    if (result.updates.target_users) setTargetUsers(result.updates.target_users.join('、'))
    setFollowUp(result.question || '已补全建议，请检查表单后继续。')
  })

  const startPackaging = () => perform(async () => {
    if (!job) return
    sync(await packageMcpJob(job.id))
  })

  const cancel = () => perform(async () => {
    if (!job) return
    sync(await cancelMcpJob(job.id))
  })

  const download = () => perform(async () => {
    if (!job) return
    const blob = await downloadMcpArtifact(job.id)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${name || 'mcp-service'}-package.zip`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  })

  const deploy = () => perform(async () => {
    if (!job) return
    sync(await deployMcpJob(job.id))
    setActiveStep(4)
  })

  const check = (call = false) => perform(async () => {
    if (!job) return
    if (call && !window.confirm(`即将执行 ${testTool}，此操作可能修改服务数据。确定继续吗？`)) return
    let args: Record<string, unknown> = {}
    if (call) {
      const parsed: unknown = JSON.parse(argumentsJson)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('调用参数应为 JSON 对象')
      args = parsed as Record<string, unknown>
    }
    const result = await checkMcpJob(job.id, call ? testTool : undefined, args)
    sync(result.job)
    setCallResult(call ? result.call : null)
    if (call && result.call && typeof result.call === 'object' && 'isError' in result.call && result.call.isError) {
      setError('工具已执行，但返回了业务错误。请检查下方结果。')
    } else {
      toast.success(call ? '工具调用完成' : 'MCP 协议和工具清单验证通过')
    }
  })

  const submitReview = () => perform(async () => {
    if (!job) return
    sync(await submitMcpReview(job.id))
    toast.success('已提交现有平台审核流程')
  })

  if (!job && jobId) return <div className="p-8 text-sm text-gray-500">{error || '正在读取封装任务…'}</div>

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <button className="text-sm text-blue-600 mb-4" onClick={() => navigate('/supplier/mcp')}>← 我的 MCP 服务</button>
      <h1 className="text-2xl font-bold text-gray-900">发布为可调用临床服务</h1>
      <p className="text-sm text-gray-500 mt-1">从已有临床模型或 Python 源码中选择实际能力，核对输入规范后生成工具服务。接口验证与临床验证分别记录。</p>
      <div className="flex flex-wrap gap-2 my-6" aria-label="封装步骤">
        {steps.map((step, index) => <button key={step} onClick={() => setActiveStep(index)} className={`px-3 py-2 rounded-lg text-sm ${activeStep === index ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}>{index + 1}. {step}</button>)}
      </div>
      {error && <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</p>}
      {job?.error && job.error !== error && <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{job.error}</p>}

      <section className="bg-white border rounded-2xl p-6 space-y-5">
        {activeStep === 0 && <>
          <h2 className="font-semibold text-lg">选择源码</h2>
          {job?.sourceName ? <p className="text-sm">当前源码：<strong>{job.sourceName}</strong>　摘要：{job.sourceDigest.slice(0, 12)}</p> : <>
            <div className="flex gap-2 items-center flex-wrap"><select value={chosenAlgorithm} onChange={(event) => setChosenAlgorithm(event.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-56"><option value="">选择我的算法模型</option>{algorithms.map((algorithm) => <option key={algorithm.id} value={algorithm.id}>{algorithm.name}</option>)}</select><button disabled={busy} onClick={selectAlgorithm} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">使用算法</button></div>
            <div className="text-sm text-gray-500">或上传包含 Python 源码的 .py/.zip 文件（最大 15 MB）</div>
            <input aria-label="上传 Python 源码" type="file" accept=".py,.zip" disabled={busy} onChange={(event) => upload(event.target.files?.[0])} className="block text-sm" />
          </>}
          {!!job?.sourceName && <button onClick={() => setActiveStep(1)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">下一步：填写想定</button>}
        </>}

        {activeStep === 1 && <>
          <h2 className="font-semibold text-lg">描述服务使用想定</h2>
          <div className="bg-blue-50 rounded-xl p-4 space-y-2"><label className="block text-sm">描述目标患者、预测时点、可用数据和结果含义<textarea value={intentMessage} onChange={(event) => setIntentMessage(event.target.value)} className="mt-1 block w-full border rounded-lg p-2 h-20 bg-white" placeholder="例如：面向成年住院患者，用入院时数据输出 30 天再入院风险，供研究评估" /></label><p className="text-xs text-blue-800">只提供字段结构和数据摘要，不输入原始病历。</p><button disabled={busy || !job?.sourceName} onClick={suggest} className="border border-blue-600 text-blue-700 px-3 py-1.5 rounded-lg text-sm disabled:opacity-50">智能补全想定</button>{followUp && <p className="text-sm text-blue-800">{followUp}</p>}</div>
          <label className="block text-sm">服务名称<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} disabled={!!job?.serviceId} className="mt-1 block w-full border rounded-lg p-2" placeholder="例如：异常交易评分服务" /></label>
          <label className="block text-sm">使用场景<textarea value={scenario} onChange={(event) => setScenario(event.target.value)} disabled={!!job?.serviceId} className="mt-1 block w-full border rounded-lg p-2 h-24" placeholder="谁在什么情况下调用哪些能力，以及希望获得什么结果" /></label>
          <label className="block text-sm">面向用户<input value={targetUsers} onChange={(event) => setTargetUsers(event.target.value)} disabled={!!job?.serviceId} className="mt-1 block w-full border rounded-lg p-2" placeholder="例如：业务分析人员、智能助手" /></label>
          <button onClick={() => setActiveStep(2)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">下一步：确认工具</button>
        </>}

        {activeStep === 2 && <>
          <h2 className="font-semibold text-lg">确认将暴露的工具</h2>
          <p className="text-sm text-gray-500">以下函数由源码静态分析得出。请核对每个输入的医学含义、类型、单位、允许范围和必填条件；默认参数仅是字符串占位，需要人工修订。缺失值、错误单位和不适用人群应明确拒绝或处理。</p>
          {!job?.candidates.length && <p className="text-sm text-amber-700">请先选择源码。</p>}
          {job?.candidates.map((candidate) => {
            const selected = tools.find((item) => item.entrypoint === candidate.entrypoint)
            return <div key={candidate.entrypoint} className="border rounded-xl p-4 space-y-3">
              <label className="flex gap-3 items-start"><input type="checkbox" checked={!!selected} disabled={!!job.serviceId} onChange={() => toggle(candidate)} className="mt-1" /><span><strong>{candidate.name}</strong><span className="block text-xs text-gray-500">{candidate.entrypoint}　参数：{candidate.parameters.join('、') || '无'}</span><span className="block text-sm mt-1">{candidate.description || '源码没有说明，请补充工具说明'}</span></span></label>
              {selected && <div className="pl-6 space-y-2">
                <label className="block text-sm">工具名称<input value={selected.name} disabled={!!job.serviceId} onChange={(event) => setTools((items) => items.map((item) => item.entrypoint === selected.entrypoint ? { ...item, name: event.target.value } : item))} className="block border rounded-lg p-2 w-full mt-1" /></label>
                <label className="block text-sm">工具说明<input value={selected.description} disabled={!!job.serviceId} onChange={(event) => setTools((items) => items.map((item) => item.entrypoint === selected.entrypoint ? { ...item, description: event.target.value } : item))} className="block border rounded-lg p-2 w-full mt-1" /></label>
                <label className="block text-sm">输入 JSON Schema<textarea key={selected.entrypoint} defaultValue={JSON.stringify(selected.input_schema, null, 2)} disabled={!!job.serviceId} onBlur={(event) => {
                  try {
                    const schema = JSON.parse(event.target.value) as Record<string, unknown>
                    if (schema.type !== 'object') throw new Error('根节点必须为 object')
                    setTools((items) => items.map((item) => item.entrypoint === selected.entrypoint ? { ...item, input_schema: schema } : item))
                    setSchemaError('')
                  } catch { setSchemaError('输入 Schema 不是有效的 JSON 对象') }
                }} className="font-mono text-xs block border rounded-lg p-2 w-full mt-1 h-40" /></label>
              </div>}
            </div>
          })}
          {schemaError && <p role="alert" className="text-red-600 text-sm">{schemaError}</p>}
          {!job?.serviceId && <button disabled={busy || !job?.sourceName} onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">保存想定并继续</button>}
        </>}

        {activeStep === 3 && <>
          <h2 className="font-semibold text-lg">生成 MCP 封装包</h2>
          <p className="text-sm text-gray-600">源码：{job?.sourceName || '未选择'}　工具：{job?.spec.tools?.map((tool) => tool.name).join('、') || '尚未确认'}</p>
          <p className="text-sm">状态：{job?.status || '待创建'}　{job?.progressText || ''}</p>
          {job?.status === 'packaging' && <p className="text-sm text-blue-700">Agent 正在生成。可以离开页面，稍后返回查看结果。</p>}
          {job?.status === 'packaging' && <button disabled={busy} onClick={cancel} className="border border-gray-300 px-4 py-2 rounded-lg text-sm">取消生成</button>}
          {!['packaging', 'cancelling'].includes(job?.status || '') && !job?.serviceId && <button disabled={busy || !job?.spec.tools?.length} onClick={startPackaging} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">{job?.artifactReady ? '重新生成' : '开始生成'}</button>}
          {job?.artifactReady && <div className="flex gap-2 flex-wrap"><button disabled={busy} onClick={download} className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg text-sm">下载封装包</button><button disabled={busy || !!job.serviceId} onClick={deploy} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">部署到平台</button></div>}
        </>}

        {activeStep === 4 && <>
          <h2 className="font-semibold text-lg">部署与真实工具验证</h2>
          {!job?.serviceId ? <p className="text-sm text-gray-500">请先生成封装包并选择部署。</p> : <>
            <p className="text-sm">服务编号：{job.serviceId}　容器状态：{job.serviceStatus || '正在读取'}</p>
            {job.serviceStatus === 'deploying' && <p className="text-sm text-blue-700">容器正在构建和启动，请稍后验证。</p>}
            {job.serviceStatus === 'error' && <p className="text-sm text-red-700">容器部署失败，请检查服务部署日志。</p>}
            <button disabled={busy || !['pre_release_unrated', 'pre_release_pending', 'released'].includes(job.serviceStatus || '')} onClick={() => check(false)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">检查 MCP 连接和工具清单</button>
            {!!job.verifiedAt && <div className="space-y-3">
              <p className="text-sm text-green-700">协议和工具清单已验证，这仅说明接口可连接。请继续用合成数据测试正常输入、边界值、缺失值和错误单位；临床有效性需另行验证。</p>
              <select value={testTool} onChange={(event) => { setTestTool(event.target.value); setArgumentsJson('{}') }} className="border rounded-lg p-2 text-sm block w-full"><option value="">选择工具</option>{job.verifiedTools?.map((tool) => <option key={tool.name} value={tool.name}>{tool.name}</option>)}</select>
              {testTool && <pre className="text-xs bg-gray-50 border p-3 rounded-lg overflow-auto">{JSON.stringify(job.verifiedTools?.find((tool) => tool.name === testTool)?.inputSchema, null, 2)}</pre>}
              <label className="block text-sm">调用参数 JSON<textarea value={argumentsJson} onChange={(event) => setArgumentsJson(event.target.value)} className="font-mono text-xs border rounded-lg p-2 mt-1 block w-full h-32" /></label>
              <button disabled={busy || !testTool} onClick={() => check(true)} className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg text-sm disabled:opacity-50">调用工具测试</button>
              {callResult !== null && <pre className="text-xs bg-gray-50 border p-3 rounded-lg overflow-auto max-h-80">{JSON.stringify(callResult, null, 2)}</pre>}
              {job.serviceStatus === 'pre_release_unrated' && <button disabled={busy} onClick={submitReview} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">提交平台审核</button>}
              {job.serviceStatus === 'pre_release_pending' && <p className="text-sm text-blue-700">已提交平台审核，审核通过后服务可进入市场。</p>}
              {job.serviceStatus === 'released' && <p className="text-sm text-green-700">服务已发布。</p>}
            </div>}
          </>}
        </>}
      </section>
    </div>
  )
}
