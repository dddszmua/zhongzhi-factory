import { Link } from 'react-router'

export function RetiredServicePage() {
  return <main className="mx-auto max-w-xl p-8 text-center space-y-4">
    <h1 className="text-xl font-semibold">该入口已停用</h1>
    <p className="text-gray-600">请按临床科室查找算法模型，或创建自己的模型。</p>
    <Link className="cw-button" to="/market">进入科室模型</Link>
  </main>
}
