import { useNavigate } from 'react-router'
import { Package } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { BLUE } from '@/lib/constants'
import type { AlgorithmProduct } from '@/lib/mappers'

export function ProductCard({ product }: { product: AlgorithmProduct }) {
  const navigate = useNavigate()
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50">
          <Package size={18} style={{ color: BLUE }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base leading-snug">{product.name}</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{product.description}</p>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
        <div className="flex gap-2 text-xs">
          <span className="text-gray-400 shrink-0">输入：</span>
          <span className="text-gray-700 font-medium">{product.inputType}</span>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="text-gray-400 shrink-0">输出：</span>
          <span className="text-gray-700 font-medium">{product.outputType}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {product.tags.slice(0, 4).map((t) => (
          <Badge key={t} color="gray">
            {t}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {product.badges.map(({ label, color }) => (
          <Badge key={label} color={color}>
            {label}
          </Badge>
        ))}
      </div>
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => navigate(`/products/${product.id}?trial=1`)}
          className="flex-1 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-all"
          style={{ background: BLUE }}
        >
          试一下
        </button>
        <button
          onClick={() => navigate(`/products/${product.id}`)}
          className="flex-1 py-2 text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all"
        >
          查看详情
        </button>
      </div>
    </div>
  )
}
