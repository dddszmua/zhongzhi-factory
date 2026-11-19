import { NavLink, Outlet } from 'react-router'
import { NavBar } from './NavBar'

const links = [
  ['模型概览', '/supplier'], ['我的模型', '/supplier/products'],
  ['创建与任务', '/supplier/create'], ['模型试用', '/supplier/trial'],
  ['科研评估', '/supplier/evaluation'],
  ['咨询消息', '/messages'],
]

export function SupplierLayout() {
  return (
    <div className="cw-supplier">
      <NavBar />
      <div className="cw-supplier-layout">
        <nav className="cw-supplier-sidebar" aria-label="模型管理导航">
          {links.map(([label, to]) => <NavLink key={to} to={to} end={to === '/supplier'}>{label}</NavLink>)}
        </nav>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  )
}
