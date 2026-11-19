import { Link } from 'react-router'
import { ArrowUpRight, Activity } from 'lucide-react'
import type { AlgorithmProduct } from '@/lib/mappers'
import { readClinicalCard } from '@/lib/clinical'

export function ProductCard({ product }: { product: AlgorithmProduct }) {
  const card = readClinicalCard(product.raw)
  const detailUrl = '/products/' + product.id
  return (
    <article className="cw-tool-card">
      <div className="cw-tool-top">
        <span className="cw-icon"><Activity size={21} /></span>
        <span className="cw-status">{product.trialable ? '支持在线试用' : '查看适用说明'}</span>
      </div>
      <h3><Link to={detailUrl}>{product.name}</Link></h3>
      <p className="cw-description">{product.description}</p>
      <div className="cw-tags">
        {[card?.specialty, card?.population].filter(Boolean).map((label, i) => <span key={i}>{label}</span>)}
      </div>
      <dl className="cw-io">
        <div><dt>需要输入</dt><dd>{card?.inputs || product.inputType}</dd></div>
        <div><dt>得到结果</dt><dd>{card?.output || product.outputType}</dd></div>
      </dl>
      <div className="cw-tool-actions">
        <Link className="cw-button" to={detailUrl + (product.trialable ? '?trial=1' : '')}>
          {product.trialable ? '在线试用' : '查看模型'}<ArrowUpRight size={16} />
        </Link>
        <Link to={detailUrl}>适用范围与依据</Link>
      </div>
    </article>
  )
}
