import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { BLUE, PURPLE } from '@/lib/constants'

export function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const navItems = [
    { label: '找临床算法', to: '/market' },
    { label: '描述临床需求', to: '/demand' },
    { label: '临床可调用服务', to: '/mcp-market' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-black/5 shadow-sm">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between gap-8">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})` }}
          >
            众
          </div>
          <div>
            <div className="font-bold text-gray-900 text-base leading-tight">临床模型众智工场</div>
            <div className="text-[10px] text-gray-400 leading-tight">临床算法开发、验证与服务化</div>
          </div>
        </Link>
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150 font-medium"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            <>
              <Link to="/favorites" className="px-2 py-2 text-sm text-gray-600 hover:text-blue-600">我的收藏</Link>
              <Link to="/messages" className="px-2 py-2 text-sm text-gray-600 hover:text-blue-600">消息</Link>
              <span className="text-sm text-gray-600 font-medium max-w-[120px] truncate">
                {user?.name || user?.username}
              </span>
              <button
                onClick={() => navigate('/supplier')}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-all"
              >
                研发工作台
              </button>
              <button
                onClick={() => void logout()}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                登录
              </button>
              <button
                onClick={() => navigate('/supplier')}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-all"
              >
                研发工作台
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/market')}
            className="px-4 py-2 text-sm text-white rounded-lg font-semibold transition-all hover:opacity-90 shadow-sm"
            style={{ background: BLUE }}
          >
            浏览目录
          </button>
        </div>
        <button className="lg:hidden p-2 text-gray-600" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-black/5 px-6 py-4 flex flex-col gap-2">
          {navItems.map((item) => (
            <Link key={item.label} to={item.to} className="text-left py-2 text-sm text-gray-700 font-medium" onClick={() => setMobileOpen(false)}>
              {item.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2 border-t border-black/5">
            <button
              className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 font-medium"
              onClick={() => {
                setMobileOpen(false)
                navigate(isAuthenticated ? '/supplier' : '/login')
              }}
            >
              {isAuthenticated ? '研发工作台' : '登录'}
            </button>
            <button
              className="flex-1 py-2 text-sm text-white rounded-lg font-semibold"
              style={{ background: BLUE }}
              onClick={() => {
                setMobileOpen(false)
                navigate('/market')
              }}
            >
              浏览目录
            </button>
          </div>
          {isAuthenticated && <div className="flex gap-5 text-sm text-blue-600"><Link to="/favorites" onClick={() => setMobileOpen(false)}>我的收藏</Link><Link to="/messages" onClick={() => setMobileOpen(false)}>消息中心</Link></div>}
        </div>
      )}
    </header>
  )
}
