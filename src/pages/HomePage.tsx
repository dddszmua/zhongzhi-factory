import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowRight, BarChart3, BookOpen, ClipboardCheck, Cloud, Cpu, Droplets, Eye, FileText, MessageCircle, Paperclip, RefreshCw, Search, Settings, Shield, TrendingUp, Users, WandSparkles, Wrench } from 'lucide-react'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'
import { filterAlgorithmModels } from '@/api/services'
import { mapAlgorithmModels, type AlgorithmProduct } from '@/lib/mappers'
import { readClinicalCard } from '@/lib/clinical'

const categories = ['全部', '诊断与分诊辅助', '风险预测', '影像与病理', '检验与生理信号', '治疗决策支持', '随访与慢病', '临床文书', '科研建模']
const examples = [
  { name: '成人肾功能估算工具', description: '将相关指标整理为便于使用的估算工具。', input: '年龄、血清肌酐等所需指标', output: '估算结果与适用范围说明', tags: ['肾内科', '检验分析', '计算器'], category: '检验与生理信号', icon: Droplets, tone: 'blue' },
  { name: '住院风险预测研究模型', description: '将研究中的预测方法转成结构化工具。', input: '脱敏临床指标', output: '风险预测结果与影响因素', tags: ['跨科室', '风险预测', '表单'], category: '风险预测', icon: TrendingUp, tone: 'purple' },
  { name: '胸部影像辅助分析模型', description: '辅助呈现影像中的待关注区域。', input: '医学影像', output: '区域标注与分析提示', tags: ['影像科', '影像分析', '影像'], category: '影像与病理', icon: Eye, tone: 'cyan' },
  { name: '病历结构化提取工具', description: '从脱敏病历中提取并整理关键字段。', input: '脱敏病历文本', output: '结构化字段与原文定位', tags: ['跨科室', '临床文书', '文本'], category: '临床文书', icon: FileText, tone: 'teal' },
  { name: '慢病随访辅助工具', description: '汇总随访变化，整理待确认事项。', input: '随访记录与相关指标', output: '变化摘要与随访事项', tags: ['全科', '慢病管理', '对话'], category: '随访与慢病', icon: RefreshCw, tone: 'green' },
  { name: '临床科研建模助手', description: '围绕研究目标组织数据分析与建模。', input: '脱敏表格与研究目标', output: '数据概况与评估报告', tags: ['临床科研', '科研建模', '数据分析'], category: '科研建模', icon: BarChart3, tone: 'purple' },
]
const starts = [
  { icon: WandSparkles, tone: 'blue', title: '生成算法模型', description: '将临床经验、诊疗规则或论文方法转成模型原型。', action: '开始生成', to: '/supplier/create' },
  { icon: Search, tone: 'purple', title: '使用算法模型', description: '按临床场景查找模型，了解输入要求与结果形式。', action: '查找模型', to: '#models' },
  { icon: ClipboardCheck, tone: 'cyan', title: '评测与验证', description: '了解模型性能、适用人群及局限，完善使用依据。', action: '了解评测', to: '/supplier/evaluation' },
  { icon: Cloud, tone: 'teal', title: '托管与转化', description: '支持在线托管、同行共享及研究成果转化。', action: '了解服务', to: '#services' },
]
const steps = [
  { icon: MessageCircle, title: '描述需求', description: '说明临床问题、使用对象与预期结果。' },
  { icon: Settings, title: '生成原型', description: '结合经验、规则或研究材料形成模型原型。' },
  { icon: BarChart3, title: '评测验证', description: '了解性能、适用范围及局限。' },
  { icon: Wrench, title: '封装托管', description: '配置使用界面和共享权限。' },
  { icon: Users, title: '同行使用', description: '支持在线使用，根据反馈持续完善。' },
]
const support = [
  { icon: ClipboardCheck, tone: 'blue', title: '专业评测', description: '整理性能指标、适用范围与评测报告。', to: '/supplier/evaluation' },
  { icon: Cpu, tone: 'purple', title: '智能体封装', description: '将模型能力封装为适合任务的交互工具。', to: '/supplier/mcp' },
  { icon: Cloud, tone: 'cyan', title: '在线托管', description: '支持持续访问、版本维护与权限配置。', to: '/supplier/trial' },
  { icon: Shield, tone: 'teal', title: '知识产权分析', description: '沟通来源材料、权属问题和潜在风险。', to: '/demand' },
  { icon: BookOpen, tone: 'green', title: '论文与专利材料支持', description: '整理方法说明、实验结果及相关申请材料。', to: '/demand' },
  { icon: Users, tone: 'purple', title: '一对一转化服务', description: '围绕具体临床或科研需求开展沟通。', to: '/demand' },
]

function matchesCategory(product: AlgorithmProduct, category: string) {
  if (category === '全部') return true
  const keywords: Record<string, string[]> = {
    '诊断与分诊辅助': ['诊断', '分诊', '筛查'], '风险预测': ['风险', '预测'], '影像与病理': ['影像', '病理'],
    '检验与生理信号': ['检验', '生理', '肾', '心电'], '治疗决策支持': ['治疗', '决策', '用药'],
    '随访与慢病': ['随访', '慢病', '预后'], '临床文书': ['病历', '文书', '文本'], '科研建模': ['科研', '建模', '研究'],
  }
  const text = [product.name, product.description, product.scenario, ...product.tags].join(' ')
  return (keywords[category] || [category]).some((word) => text.includes(word))
}

export function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [mode, setMode] = useState<'generate' | 'use'>('generate')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部')
  const [products, setProducts] = useState<AlgorithmProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    filterAlgorithmModels({ domain: 'health', page: 1, pageSize: 50 })
      .then((list) => { if (!cancelled) setProducts(mapAlgorithmModels(list)) })
      .catch(() => { if (!cancelled) { setLoadError(true); setProducts([]) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reload])

  useEffect(() => {
    const id = location.hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [location.hash])

  function startGeneration(attach = false) {
    const params = new URLSearchParams()
    if (query.trim()) params.set('requirement', query.trim())
    if (attach) params.set('attach', '1')
    navigate(`/supplier/create${params.size ? `?${params}` : ''}`)
  }

  const term = search.trim().toLowerCase()
  const visibleProducts = products.filter((p) => matchesCategory(p, category) && [p.name, p.description, ...p.tags].join(' ').toLowerCase().includes(term)).slice(0, 6)
  const visibleExamples = examples.filter((p) => (category === '全部' || p.category === category) && [p.name, p.description, ...p.tags].join(' ').toLowerCase().includes(term))

  return (
    <div className="clinical-home">
      <NavBar />
      <main>
        <section className="home-hero" id="home">
          <div className="home-container">
            <div className="hero-eyebrow">临床经验与科研成果转化</div>
            <h1>让临床经验与研究成果<br />成为<span>可使用的算法模型</span></h1>
            <p className="hero-description">描述临床需求，结合论文、规则与脱敏数据，生成算法模型原型；通过评测与在线<br className="desktop-break" />托管，让专业经验服务更多同行。</p>
            <div className="hero-composer">
              <div className="composer-tabs" role="tablist" aria-label="选择模型使用方式">
                <button id="generate-tab" role="tab" aria-selected={mode === 'generate'} aria-controls="composer-panel" tabIndex={mode === 'generate' ? 0 : -1} onKeyDown={(e) => { if (e.key === 'ArrowRight') { setMode('use'); document.getElementById('use-tab')?.focus() } }} onClick={() => setMode('generate')}>生成算法模型</button>
                <button id="use-tab" role="tab" aria-selected={mode === 'use'} aria-controls="composer-panel" tabIndex={mode === 'use' ? 0 : -1} onKeyDown={(e) => { if (e.key === 'ArrowLeft') { setMode('generate'); document.getElementById('generate-tab')?.focus() } }} onClick={() => setMode('use')}>使用算法模型</button>
              </div>
              <form id="composer-panel" role="tabpanel" aria-labelledby={mode === 'generate' ? 'generate-tab' : 'use-tab'} onSubmit={(e) => { e.preventDefault(); if (mode === 'generate') startGeneration(); else navigate(`/market${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`) }}>
                <textarea ref={inputRef} aria-label={mode === 'generate' ? '描述临床问题' : '描述要查找的模型'} value={query} onChange={(e) => setQuery(e.target.value)} maxLength={2000} placeholder={mode === 'generate' ? '请描述您想解决的临床问题，例如：将论文中的风险预测方法转成可供本科室使用的在线工具。' : '搜索模型名称或描述使用场景，例如：成人肾功能估算、住院风险预测。'} />
                <div className="composer-actions">
                  <button type="button" className="attachment-link" onClick={() => mode === 'generate' ? startGeneration(true) : navigate('/market')}>
                    {mode === 'generate' ? <Paperclip size={18} /> : <Search size={18} />}{mode === 'generate' ? '添加论文或规则材料' : '浏览全部临床模型'}
                  </button>
                  <button className="home-button" type="submit">{mode === 'generate' ? '开始生成' : '查找模型'}</button>
                </div>
              </form>
            </div>
            <p className="hero-note">支持临床经验、论文方法与脱敏数据，生成后按用途完成评测。</p>
            <div className="hero-chips">{['临床评分', '风险预测', '影像分析', '随访管理', '科研建模'].map((item) => <button key={item} onClick={() => { setQuery(item); inputRef.current?.focus() }}>{item}</button>)}</div>
          </div>
        </section>

        <section className="home-section home-starts">
          <div className="home-container">
            <div className="section-heading"><h2>从临床问题出发，选择您的起点</h2><p>创建自己的模型，也可以从已有工具开始。</p></div>
            <div className="start-grid">{starts.map(({ icon: Icon, ...item }) => <Link className="start-card" to={item.to} key={item.title}><span className={`home-icon tone-${item.tone}`}><Icon size={26} /></span><h3>{item.title}</h3><p>{item.description}</p><span className="card-action">{item.action}<ArrowRight size={16} /></span></Link>)}</div>
          </div>
        </section>

        <section className="home-section home-catalog" id="models">
          <div className="home-container">
            <div className="section-heading"><h2>找到适合临床场景的算法模型</h2><p>了解模型用途、输入要求与结果形式，从具体问题开始。</p></div>
            <label className="catalog-search"><Search size={20} /><input aria-label="搜索临床模型" placeholder="搜索模型名称、场景或标签" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
            <div className="catalog-filters" aria-label="模型分类">{categories.map((item) => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
            {loading ? <div className="catalog-state" role="status">正在加载临床模型…</div> : <>
              {products.length === 0 && <p className="catalog-notice" role="status">{loadError ? '临床目录暂时无法加载。以下为应用场景示例。' : '当前暂无已审核模型，以下为应用场景示例。'}{loadError && <button onClick={() => setReload((n) => n + 1)}>重新加载</button>}</p>}
              <div className="model-grid">
                {products.length > 0 ? visibleProducts.map((p) => <article className="home-model-card" key={p.id}>
                  <div className="model-heading"><span className="home-icon tone-blue"><Cpu size={23} /></span><div><h3>{p.name}</h3><p>{p.description}</p></div></div>
                  <div className="model-io"><p><span>输入</span>{readClinicalCard(p.raw)?.inputs || p.inputType}</p><p><span>输出</span>{readClinicalCard(p.raw)?.output || p.outputType}</p></div>
                  <div className="model-tags">{p.tags.slice(0, 3).map((tag, i) => <span key={`${tag}-${i}`}>{tag}</span>)}</div>
                  <div className="model-actions"><Link className="home-button" to={`/products/${p.id}${p.trialable ? '?trial=1' : ''}`}>{p.trialable ? '在线使用' : '查看模型'}</Link><Link className="home-button outline" to={`/products/${p.id}`}>了解模型</Link></div>
                </article>) : visibleExamples.map(({ icon: Icon, ...p }) => <article className="home-model-card" key={p.name}>
                  <div className="model-heading"><span className={`home-icon tone-${p.tone}`}><Icon size={23} /></span><div><h3>{p.name}<span className="example-badge">示例</span></h3><p>{p.description}</p></div></div>
                  <div className="model-io"><p><span>输入</span>{p.input}</p><p><span>输出</span>{p.output}</p></div>
                  <div className="model-tags">{p.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <div className="model-actions"><Link className="home-button" to={`/market?q=${encodeURIComponent(p.tags[1])}`}>查找同类模型</Link><Link className="home-button outline" to={`/demand?requirement=${encodeURIComponent(p.name)}`}>描述我的需求</Link></div>
                </article>)}
              </div>
              {(products.length ? visibleProducts : visibleExamples).length === 0 && <div className="catalog-state">没有符合当前条件的模型。<button onClick={() => { setCategory('全部'); setSearch('') }}>清除筛选</button></div>}
              <div className="catalog-more"><Link to="/market">浏览全部临床模型<ArrowRight size={17} /></Link></div>
            </>}
          </div>
        </section>

        <section className="home-section" id="value"><div className="home-container">
          <div className="section-heading"><h2>让经验可以共享，让研究可以应用</h2></div>
          <div className="value-grid">
            <article className="value-card"><h3>把临床经验变成同行可用的工具</h3><p>将资深医生的经验与诊疗规则整理为算法工具，经评测和权限设置后，支持在科室、医院或医联体内共享。</p><div className="value-flow"><span>经验与规则</span><ArrowRight size={16} /><span>算法工具</span><ArrowRight size={16} /><span>同行共享</span></div><Link className="home-button" to="/supplier/create">转化我的临床经验</Link></article>
            <article className="value-card purple"><h3>把研究成果变成可交付的模型</h3><p>围绕论文方法与研究数据开展模型复现、评测和封装，衔接论文材料整理、知识产权分析及授权转化。</p><div className="value-flow"><span>论文与数据</span><ArrowRight size={16} /><span>模型与评测</span><ArrowRight size={16} /><span>成果转化</span></div><Link className="home-button" to="/supplier/create?attach=1">转化我的研究成果</Link></article>
          </div>
        </div></section>

        <section className="home-section home-workflow" id="workflow"><div className="home-container">
          <div className="section-heading"><h2>从临床需求到模型使用</h2></div>
          <div className="workflow-grid">{steps.map(({ icon: Icon, title, description }, i) => <div className="workflow-step" key={title}><span className="workflow-icon"><Icon size={29} /></span><span className="step-number">0{i + 1}</span><h3>{title}</h3><p>{description}</p></div>)}</div>
        </div></section>

        <section className="home-section" id="services"><div className="home-container">
          <div className="section-heading"><h2>从模型原型，走向可交付成果</h2><p>围绕模型质量、使用方式与研究转化，提供配套支持。</p></div>
          <div className="support-grid">{support.map(({ icon: Icon, ...item }) => <Link className="support-card" to={item.to} key={item.title}><span className={`home-icon tone-${item.tone}`}><Icon size={23} /></span><div><h3>{item.title}</h3><p>{item.description}</p></div></Link>)}</div>
        </div></section>

        <section className="home-cta"><div className="home-container"><h2>让您的专业经验，服务更多临床同行</h2><p>面向临床医生、科研团队与医疗机构，探索算法模型的生成、共享与转化。</p><div><Link className="home-button cta-outline" to="/demand">描述我的需求</Link><Link className="home-button cta-white" to="#services">了解合作方式</Link></div></div></section>
      </main>
      <Footer />
    </div>
  )
}
