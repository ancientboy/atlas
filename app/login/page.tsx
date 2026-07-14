import Link from "next/link";

export default function LoginPage() {
  return <main className="site-shell auth-shell"><section className="auth-card"><Link href="/" className="atlas-logo"><span>▲</span><div><strong>ATLAS</strong><small>Private Alpha</small></div></Link><h1>登录 Atlas</h1><p>当前私人 Alpha 使用可信的 <code>oai-authenticated-user-*</code> Sites 身份 Header。公开注册和账号管理将在后续版本提供。</p><Link className="primary-button" href="/app">进入工作台</Link></section></main>;
}
