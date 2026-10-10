import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Activity, Menu, X } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'

const navigation = [
  { label: '首页', id: 'home' },
  { label: '临床模型', id: 'models' },
  { label: '应用价值', id: 'value' },
  { label: '评测与转化', id: 'services' },
  { label: '使用流程', id: 'workflow' },
]

export function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [active, setActive] = useState('home')
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()

  useEffect(() => { setMobileOpen(false) }, [location.pathname, location.hash])
  useEffect(() => {
    if (location.pathname !== '/') return
    const update = () => {
      const sections = navigation.map(({ id }) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el))
      const current = sections.filter((el) => el.getBoundingClientRect().top <= 160).sort((a, b) => b.offsetTop - a.offsetTop)[0]
      setActive(current?.id || 'home')
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [location.pathname])

  function onSection(id: string) {
    setMobileOpen(false)
    if (location.pathname === '/') document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return <header className="site-header">
    <div className="site-header-inner">
      <Link to="/" className="site-brand" onClick={() => onSection('home')} aria-label="算医未来首页"><span className="site-logo"><Activity size={25} strokeWidth={2.5} /></span><span><strong>算医未来</strong><small>临床医疗算法模型平台</small></span></Link>
      <nav className="site-nav" aria-label="主导航">{navigation.map(({ label, id }) => <Link key={id} to={`/#${id}`} onClick={() => onSection(id)} aria-current={location.pathname === '/' && active === id ? 'location' : undefined}>{label}</Link>)}</nav>
      <div className="site-header-actions">
        {isAuthenticated && <details className="site-account"><summary>{user?.name || user?.username || '我的账户'}</summary><div className="account-menu"><Link to="/supplier">研发工作台</Link><Link to="/favorites">我的收藏</Link><Link to="/messages">消息中心</Link><Link to="/mcp-market">可调用服务</Link><button onClick={() => void logout()}>退出登录</button></div></details>}
        <Link className="home-button" to="/supplier/create">开始体验</Link>
      </div>
      <button className="site-menu-toggle" aria-label={mobileOpen ? '关闭导航菜单' : '打开导航菜单'} aria-expanded={mobileOpen} aria-controls="mobile-site-nav" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
    </div>
    {mobileOpen && <nav className="site-mobile-nav" id="mobile-site-nav" aria-label="移动端导航">{navigation.map(({ label, id }) => <Link key={id} to={`/#${id}`} onClick={() => onSection(id)}>{label}</Link>)}<Link to="/market">浏览全部模型</Link><Link to="/supplier">研发工作台</Link>{isAuthenticated ? <><Link to="/favorites">我的收藏</Link><Link to="/messages">消息中心</Link><button className="text-left p-2" onClick={() => { setMobileOpen(false); void logout() }}>退出登录</button></> : <Link to="/login">登录 / 注册</Link>}</nav>}
  </header>
}
