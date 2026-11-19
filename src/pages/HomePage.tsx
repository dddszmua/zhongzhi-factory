import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Search, ArrowRight, Heart, FileText, MessageSquare, FlaskConical, Stethoscope } from 'lucide-react'
import { NavBar } from '@/components/layout/NavBar'
import { ProductCard } from '@/components/product/ProductCard'
import { filterAlgorithmModels } from '@/api/services'
import { getInterestedAlgorithms } from '@/api/marketplace'
import { listCreationJobs, type CreationJob } from '@/api/clinicalCreation'
import { mapAlgorithmModels, type AlgorithmProduct } from '@/lib/mappers'
import { departments, matchesDepartment } from '@/lib/departments'
import { useAuth } from '@/auth/AuthContext'

const labels: Record<string, string> = {
  draft: '继续完善', running: '查看进度', completed: '查看生成结果',
  failed: '检查并重试', interrupted: '恢复任务', published: '已保存',
}
const shortcuts = [
  { to: '/supplier/create', icon: MessageSquare, title: '创建任务', description: '发起新任务或继续已有任务' },
  { to: '/favorites', icon: Heart, title: '我的收藏', description: '快速找到常用模型' },
  { to: '/supplier/evaluation', icon: FlaskConical, title: '科研评估', description: '使用验证数据检查模型表现' },
  { to: '/supplier/create/legacy', icon: FileText, title: '导入已有代码', description: '登记已有的 Python 算法' },
]

export function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<AlgorithmProduct[]>([])
  const [favorites, setFavorites] = useState<AlgorithmProduct[]>([])
  const [jobs, setJobs] = useState<CreationJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [personalError, setPersonalError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    filterAlgorithmModels()
      .then((list) => { if (active) setProducts(mapAlgorithmModels(list)) })
      .catch(() => { if (active) setError('暂时无法连接模型服务，请稍后重试。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  useEffect(() => {
    let active = true
    setFavorites([])
    setJobs([])
    setPersonalError('')
    if (isAuthenticated) {
      Promise.all([getInterestedAlgorithms(), listCreationJobs()]).then(([list, tasks]) => {
        if (active) {
          setFavorites(mapAlgorithmModels(list))
          setJobs(tasks.filter((job) => job.status !== 'published'))
        }
      }).catch(() => { if (active) setPersonalError('收藏与任务暂时无法加载，可从对应入口查看。') })
    }
    return () => { active = false }
  }, [isAuthenticated, reload])

  return (
    <div className="cw-app">
      <NavBar />
      <main className="cw-container">
        <section className="cw-welcome">
          <div>
            <p className="cw-eyebrow">为每一次临床探索，找到合适的模型</p>
            <h1>从您熟悉的科室开始</h1>
            <p>查找临床模型，核对适用条件，或将研究方法转化为自己的模型。</p>
            <form className="cw-search" onSubmit={(event) => {
              event.preventDefault()
              navigate('/market?q=' + encodeURIComponent(query.trim()))
            }}>
              <Search size={22} />
              <input aria-label="搜索临床模型" placeholder="搜索模型名称、疾病或临床任务" value={query} onChange={(event) => setQuery(event.target.value)} />
              <button className="cw-button">查找模型<ArrowRight size={17} /></button>
            </form>
            <div className="cw-search-hints">
              从任务出发
              {['评分计算', '风险预测', '随访评估'].map((item) => <Link key={item} to={'/market?q=' + encodeURIComponent(item)}>{item}</Link>)}
            </div>
          </div>
          <aside className="cw-welcome-aside">
            <Stethoscope size={38} strokeWidth={1.4} />
            <h2>把研究方法变成模型</h2>
            <p>描述临床需求，或上传论文，逐步完成模型创建与试用。</p>
            <Link to="/supplier/create">创建我的模型<ArrowRight size={17} /></Link>
          </aside>
        </section>
        <section className="cw-section">
          <div className="cw-section-heading">
            <div><h2>按科室找模型</h2><p>选择熟悉的专科，查看相关模型与适用范围。</p></div>
            <Link to="/market">全部科室<ArrowRight size={16} /></Link>
          </div>
          <div className="cw-department-grid">
            {departments.slice(1).map((item) => (
              <Link key={item.name} to={'/market?department=' + encodeURIComponent(item.name)}>
                <span>{item.name}<small className="block mt-1 text-xs text-gray-500">{loading ? "正在加载" : `${products.filter(p => p.trialable && matchesDepartment(p, item.name)).length} 个可试用模型`}</small></span><ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
        <div className="cw-home-columns">
          <section className="cw-section">
            <div className="cw-section-heading">
              <div><h2>{favorites.length ? '我的常用模型' : '探索临床模型'}</h2><p>{favorites.length ? '您收藏的模型，随时打开。' : '从已进入公开目录的模型开始。'}</p></div>
              <Link to={favorites.length ? '/favorites' : '/market'}>查看全部<ArrowRight size={16} /></Link>
            </div>
            {loading ? <div className="cw-empty" role="status">正在加载临床模型…</div> : error ? (
              <div className="cw-empty" role="alert"><p>{error}</p><button className="cw-button secondary" onClick={() => setReload((n) => n + 1)}>重新加载</button></div>
            ) : (
              <div className="cw-card-grid">
                {(favorites.length ? favorites : products).slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            )}
            {!loading && !error && !products.length && !favorites.length && (
              <div className="cw-empty"><h3>临床模型正在积累中</h3><p>您可以先创建模型，完成试用与审核后与同行共享。</p><Link className="cw-button secondary" to="/supplier/create">创建模型</Link></div>
            )}
          </section>
          <aside className="cw-section cw-side-panel">
            <h2>我的工作</h2>
            {personalError && <p role="status">{personalError}</p>}
            {jobs.slice(0, 4).map((job) => (
              <Link className="cw-task" key={job.id} to={'/supplier/create/task/' + job.id}>
                <strong>{job.name || '未命名创建任务'}</strong><span>{labels[job.status]}<ArrowRight size={15} /></span>
              </Link>
            ))}
            {shortcuts.map(({ to, icon: Icon, title, description }) => (
              <Link className="cw-shortcut" key={to} to={to}>
                <Icon size={21} /><div><strong>{title}</strong><small>{description}</small></div><ArrowRight size={16} />
              </Link>
            ))}
          </aside>
        </div>
        <footer className="cw-footer">临床众智工场 · 使用前请核对模型适用范围、输入要求与验证依据。</footer>
      </main>
    </div>
  )
}
