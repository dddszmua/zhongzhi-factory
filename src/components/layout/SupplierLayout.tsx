import { NavLink, Outlet, useNavigate } from 'react-router'
import {
  LayoutDashboard,
  ShoppingBag,
  PlusCircle,
  FlaskConical,
  Boxes,
  BadgeCheck,
  ShoppingCart,
  BookOpen,
  LineChart,
  Settings,
  Bell,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { BLUE, PURPLE } from '@/lib/constants'

const sidebarItems = [
  { icon: LayoutDashboard, label: '工作台', to: '/supplier' },
  { icon: ShoppingBag, label: '我的算法商品', to: '/supplier/products' },
  { icon: PlusCircle, label: '发布新算法', to: '/supplier/create' },
  { icon: Boxes, label: '我的 MCP 服务', to: '/supplier/mcp' },
  { icon: FlaskConical, label: '在线试用配置', to: '/supplier/trial' },
  { icon: Bell, label: '咨询消息', to: '/messages' },
  { icon: BadgeCheck, label: '评测认证', to: null },
  { icon: ShoppingCart, label: '订单与交易', to: null },
  { icon: BookOpen, label: '案例与模板', to: null },
  { icon: LineChart, label: '数据统计', to: null },
  { icon: Settings, label: '账号设置', to: null },
]

export function SupplierLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const displayName = user?.name || user?.username || '用户'
  const initial = displayName.slice(0, 1)

  return (
    <div
      className="flex h-screen bg-[#f8f9fc] overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      <aside className="w-56 shrink-0 bg-white border-r border-black/5 flex flex-col h-full">
        <div className="px-5 py-5 border-b border-black/5">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
              style={{ background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})` }}
            >
              众
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">众智工场</div>
              <div className="text-[9px] text-gray-400 leading-tight">供应商中心</div>
            </div>
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {sidebarItems.map(({ icon: Icon, label, to }) => {
            if (!to) {
              return (
                <div
                  key={label}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-400 opacity-50 cursor-not-allowed font-medium"
                  title="首期暂未开放"
                >
                  <Icon size={16} />
                  {label}
                </div>
              )
            }
            return (
              <NavLink
                key={label}
                to={to}
                end={to === '/supplier'}
                className={({ isActive }) =>
                  `w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            )
          })}
        </nav>
        <div className="px-4 py-4 border-t border-black/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
              {initial}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-800">{displayName}</div>
              <div className="text-[10px] text-gray-400">{user?.username}</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-black/5 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">当前空间：</span>
            <button className="flex items-center gap-1 font-semibold text-gray-800 hover:text-blue-600 transition-colors">
              算法商品空间 <ChevronDown size={14} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/messages')} aria-label="消息中心" className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {initial}
              </div>
              <span className="text-sm font-medium text-gray-700">{displayName}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
