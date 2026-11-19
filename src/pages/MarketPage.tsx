import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Search, ArrowRight } from 'lucide-react'
import { NavBar } from '@/components/layout/NavBar'
import { ProductCard } from '@/components/product/ProductCard'
import { filterAlgorithmModels } from '@/api/services'
import { mapAlgorithmModels, type AlgorithmProduct } from '@/lib/mappers'
import { departments, matchesDepartment } from '@/lib/departments'
import { readClinicalCard } from '@/lib/clinical'

export function MarketPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const department = params.get('department') || '全部科室'
  const task = params.get('task') || ''
  const [keyword, setKeyword] = useState(q)
  const [products, setProducts] = useState<AlgorithmProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => { setKeyword(q) }, [q])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    filterAlgorithmModels({ q }).then((list) => { if (active) setProducts(mapAlgorithmModels(list)) })
      .catch(() => { if (active) setError('暂时无法连接模型服务，请稍后重试。') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [q, reload])

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'department') next.delete('task')
    setParams(next)
  }
  const inDepartment = products.filter((p) => matchesDepartment(p, department))
  const tasks = [...new Set(inDepartment.map((p) => readClinicalCard(p.raw)?.task).filter((value): value is string => Boolean(value)))]
  const visible = inDepartment.filter((p) => !task || readClinicalCard(p.raw)?.task === task)
  return (
    <div className="cw-app"><NavBar />
      <main className="cw-container">
        <div className="cw-page-heading"><p className="cw-eyebrow">临床模型目录</p><h1>{department === "全部科室" ? "按科室查找算法模型" : department + "算法模型"}</h1><p>按科室浏览，结合适用人群与输入要求选择模型。</p></div>
        <form className="cw-search" onSubmit={(event) => { event.preventDefault(); update('q', keyword.trim()) }}>
          <Search size={21} /><input aria-label="搜索模型" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索模型名称、疾病或临床任务" /><button className="cw-button">搜索</button>
        </form>
        <div className="cw-catalog-layout">
          <aside className="cw-department-list">
            <h2>临床科室</h2>
            <nav aria-label="科室筛选">{departments.map((item) => <button key={item.name} aria-pressed={department === item.name} onClick={() => update('department', item.name)}>{item.name}<ArrowRight size={14} /></button>)}</nav>
          </aside>
          <section>
            <div className="cw-section-heading"><h2>{department}</h2><Link className="cw-button secondary" to={"/supplier/create?department=" + encodeURIComponent(department)}>在本科室创建模型</Link><button className="cw-text-button" onClick={() => setParams({})}>清除筛选</button></div>
            {tasks.length > 0 && <div className="cw-filter-chips" aria-label="任务筛选"><button aria-pressed={!task} onClick={() => update('task', '')}>全部任务</button>{tasks.map((item) => <button key={item} aria-pressed={task === item} onClick={() => update('task', item)}>{item}</button>)}</div>}
            {loading ? <div className="cw-empty" role="status">正在加载模型…</div> : error ? (
              <div className="cw-empty" role="alert"><p>{error}</p><button className="cw-button secondary" onClick={() => setReload((n) => n + 1)}>重新加载</button></div>
            ) : (
              <><p className="cw-result-count" aria-live="polite">找到 {visible.length} 个模型{q && ' · 搜索“' + q + '”'}</p>
                {visible.length ? <div className="cw-card-grid">{visible.map((product) => <ProductCard key={product.id} product={product} />)}</div> : (
                  <div className="cw-empty"><h3>暂未找到符合条件的模型</h3><p>可以清除筛选查看完整目录，或描述需求创建自己的模型。</p><div className="cw-actions"><button className="cw-button secondary" onClick={() => setParams({})}>查看全部模型</button><Link className="cw-button" to={"/supplier/create?department=" + encodeURIComponent(department)}>创建模型</Link></div></div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
