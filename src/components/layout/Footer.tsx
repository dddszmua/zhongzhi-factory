import { Link } from 'react-router'
import { BLUE, PURPLE } from '@/lib/constants'

export function Footer() {
  const links: Record<string, Array<{ label: string; to: string }>> = {
    产品: [
      { label: 'AI算法市场', to: '/market' },
      { label: '行业方案', to: '/market' },
      { label: '定制开发', to: '/market' },
      { label: '发布算法', to: '/supplier/create' },
    ],
    资源: [
      { label: '帮助中心', to: '/' },
      { label: '案例库', to: '/market' },
    ],
    公司: [
      { label: '关于我们', to: '/' },
      { label: '联系我们', to: '/' },
    ],
  }

  return (
    <footer className="bg-gray-900 text-gray-400 pt-14 pb-8">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})` }}
              >
                众
              </div>
              <span className="font-bold text-white text-base">众智工场</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed max-w-xs mb-5">
              AI算法模型交易与交付平台。帮助业务人员找到、试用、定制适合的算法模型。
            </p>
            <div className="flex gap-2">
              <Link to="/market" className="px-4 py-2 text-xs font-bold text-white rounded-lg" style={{ background: BLUE }}>
                免费试用
              </Link>
              <Link
                to="/supplier/create"
                className="px-4 py-2 text-xs font-bold text-gray-300 rounded-lg border border-gray-700 hover:border-gray-500 transition-all"
              >
                发布算法
              </Link>
            </div>
          </div>
          {Object.entries(links).map(([cat, items]) => (
            <div key={cat}>
              <h4 className="text-white font-semibold text-sm mb-4">{cat}</h4>
              <ul className="space-y-2.5">
                {items.map((i) => (
                  <li key={i.label}>
                    <Link to={i.to} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} 众智工场. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
