import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { Btn } from '@/components/ui/Btn'
import { BLUE, PURPLE } from '@/lib/constants'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username || !password) {
      toast.error('请填写用户名和密码')
      return
    }
    if (password.length < 6) {
      toast.error('密码至少 6 位')
      return
    }
    setLoading(true)
    try {
      await register(username, password, name || username)
      toast.success('注册成功')
      navigate('/supplier')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '注册失败')
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
            <div className="font-bold text-gray-900">注册众智工场</div>
            <div className="text-xs text-gray-400">创建账号后即可发布与试用算法商品</div>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600">显示名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400"
              placeholder="可选"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">用户名</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400"
              placeholder="3-50 个字符"
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
              placeholder="至少 6 位"
              autoComplete="new-password"
            />
          </div>
          <Btn type="submit" className="w-full" disabled={loading}>
            {loading ? '注册中…' : '注册并登录'}
          </Btn>
        </form>
        <p className="text-xs text-gray-500 mt-4 text-center">
          已有账号？{' '}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            去登录
          </Link>
        </p>
      </div>
    </div>
  )
}
