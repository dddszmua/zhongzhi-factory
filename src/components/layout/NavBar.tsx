import { NavLink, Link } from 'react-router'
import { Activity, Bell, Plus, UserRound } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'

const links = [
  ['首页', '/'], ['科室模型', '/market'], ['创建模型', '/supplier/create'],
  ['我的模型', '/supplier/products'],
]

export function NavBar() {
  const { user, isAuthenticated, logout } = useAuth()
  return (
    <header className="cw-header">
      <Link className="cw-brand" to="/">
        <span><Activity size={24} /></span>
        <div><strong>临床众智工场</strong><small>临床算法模型创建与试用</small></div>
      </Link>
      <nav aria-label="主导航" className="cw-nav">
        {links.map(([label, to]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
      </nav>
      <div className="cw-account">
        <Link to="/messages" aria-label="消息中心"><Bell size={20} /></Link>
        {isAuthenticated ? (
          <details>
            <summary><UserRound size={18} />{user?.name || user?.username || '我的账户'}</summary>
            <div className="cw-menu">
              <Link to="/favorites">我的收藏</Link>
              <button onClick={() => void logout()}>退出登录</button>
            </div>
          </details>
        ) : <Link className="cw-button secondary" to="/login">登录 / 注册</Link>}
      </div>
      <nav className="cw-mobile-nav" aria-label="移动导航">
        <NavLink to="/" end>首页</NavLink>
        <NavLink to="/market">科室模型</NavLink>
        <NavLink to="/supplier/create"><Plus size={16} />创建</NavLink>
        <NavLink to="/supplier/products">我的模型</NavLink>
      </nav>
    </header>
  )
}
