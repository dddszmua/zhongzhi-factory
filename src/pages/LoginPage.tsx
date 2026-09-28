import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { Btn } from '@/components/ui/Btn'
import { BLUE, PURPLE } from '@/lib/constants'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      toast.error('请输入用户名和密码')
      return
    }
    setLoading(true)
    try {
      await login(username, password)
      toast.success('登录成功')
      const redirect = params.get('redirect') || '/supplier'
      navigate(redirect)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
        background: 'linear-gradient(160deg, #eef3ff 0%, #f8f9fc 50%, #fdf0ff 100%)',
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-black/5 shadow-xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: `linear-gradient(135deg, ${BLUE}, ${PURPLE})` }}
          >
            众
          </div>
          <div>
            <div className="font-bold text-gray-900">登录众智工场</div>
            <div className="text-xs text-gray-400">使用平台账号访问买家市场与供应商中心</div>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600">用户名</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400"
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400"
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>
          <Btn type="submit" className="w-full" disabled={loading}>
            {loading ? '登录中…' : '登录'}
          </Btn>
        </form>
        <p className="text-xs text-gray-500 mt-4 text-center">
          还没有账号？{' '}
          <Link to="/register" className="text-blue-600 font-semibold hover:underline">
            立即注册
          </Link>
        </p>
        <p className="text-[11px] text-gray-400 mt-3 text-center">
          <Link to="/" className="hover:text-gray-600">
            返回首页
          </Link>
        </p>
      </div>
    </div>
  )
}
