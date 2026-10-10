import { Link } from 'react-router'
import { Activity } from 'lucide-react'

export function Footer() {
  return <footer className="site-footer"><div className="home-container">
    <div className="site-footer-main"><div><Link to="/" className="site-brand"><span className="site-logo"><Activity size={25} strokeWidth={2.5} /></span><span><strong>算医未来</strong><small>临床医疗算法模型平台</small></span></Link><p>让临床经验与研究成果，成为可使用的算法模型。</p></div>
      <nav className="site-footer-links" aria-label="页脚导航"><Link to="/market">临床模型</Link><Link to="/supplier/create">生成模型</Link><Link to="/supplier/evaluation">评测验证</Link><Link to="/mcp-market">可调用服务</Link><Link to="/demand">描述需求</Link></nav>
    </div>
    <div className="site-footer-bottom">© {new Date().getFullYear()} 算医未来 · 众智工场</div>
  </div></footer>
}
