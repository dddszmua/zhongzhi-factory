import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Heart } from 'lucide-react'
import { getInterestedAlgorithms, removeInterested } from '@/api/marketplace'
import { mapServices, type AlgorithmProduct } from '@/lib/mappers'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'

export function FavoritesPage() {
  const [products, setProducts] = useState<AlgorithmProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    getInterestedAlgorithms()
      .then((list) => setProducts(mapServices(list)))
      .catch((error) => toast.error(error instanceof Error ? error.message : '收藏加载失败'))
      .finally(() => setLoading(false))
  }, [])

  async function remove(id: string) {
    setBusyId(id)
    try {
      await removeInterested(id)
      setProducts((list) => list.filter((item) => item.id !== id))
      toast.success('已取消收藏')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '取消收藏失败')
    } finally {
      setBusyId('')
    }
  }

  return <div className="min-h-screen bg-[#f8f9fc]">
    <NavBar />
    <main className="max-w-[1100px] mx-auto px-6 pt-28 pb-20 min-h-[70vh]">
      <h1 className="text-3xl font-bold text-gray-900">我的收藏</h1>
      <p className="text-sm text-gray-500 mt-2 mb-7">保存感兴趣的算法，方便之后试用或咨询供应商。</p>
      {loading ? <p className="text-gray-500">加载中…</p> : products.length === 0 ?
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">还没有收藏的算法。<Link className="text-blue-600 ml-2" to="/market">去市场看看</Link></div> :
        <div className="grid md:grid-cols-2 gap-4">{products.map((product) =>
          <article key={product.id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex justify-between gap-3"><h2 className="font-bold text-gray-900">{product.name}</h2><Heart size={18} className="text-blue-600 fill-blue-600 shrink-0" /></div>
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{product.description}</p>
            <p className="text-xs text-gray-400 mt-3">{product.domainLabel} · {product.statusLabel}</p>
            <div className="flex gap-4 mt-5 text-sm font-semibold"><Link to={`/products/${product.id}`} className="text-blue-600">查看详情</Link><button disabled={busyId === product.id} onClick={() => void remove(product.id)} className="text-gray-500 disabled:opacity-50">取消收藏</button></div>
          </article>)}</div>}
    </main>
    <Footer />
  </div>
}
