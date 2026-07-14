import Link from "next/link";

const pillars = [
  ["Observe", "安全抓取公开页面、市场信号和产品上下文。"],
  ["Analyze", "用服务端 LLM 生成结构化产品、ICP 和增长分析。"],
  ["Act", "把 Next Best Actions 写入 Workspace，并保留审批边界。"],
];

export default function Home() {
  return <main className="site-shell">
    <nav className="site-nav"><Logo /><div><Link href="/login">登录</Link><Link className="site-nav-cta" href="/onboarding">开始分析</Link></div></nav>
    <section className="hero-grid">
      <div className="hero-copy">
        <span className="eyebrow">LUMEWORD ATLAS · PRIVATE ALPHA</span>
        <h1>让 AI 产品每天知道下一步该做什么。</h1>
        <p>Atlas 是登录后的真实 AI Growth Workspace：安全分析你的产品官网，沉淀 Memory，发现 Opportunities，并把 3 个 Next Best Actions 推到 Today。</p>
        <p className="en-copy">Atlas turns a public product URL into a workspace-scoped AI operating brief: product summary, ICP, opportunities, activity logs, and next best actions.</p>
        <div className="hero-actions"><Link className="primary-button" href="/onboarding">进入 Onboarding</Link><Link className="secondary-button" href="/app">查看工作台</Link></div>
      </div>
      <WorkspacePreview />
    </section>
    <section className="site-card-grid">{pillars.map(([title, body]) => <article key={title} className="site-card"><span>{title}</span><p>{body}</p></article>)}</section>
  </main>;
}

function Logo() { return <Link href="/" className="atlas-logo"><span>▲</span><div><strong>ATLAS</strong><small>Growth Operator</small></div></Link>; }
function WorkspacePreview() { return <aside className="workspace-preview"><header><Logo /><span className="preview-pill">Workspace Preview</span></header><div className="preview-panel"><p>TODAY</p><h2>3 Next Best Actions</h2><div className="preview-task"><b>01</b><span>Rewrite homepage hero around ICP outcome</span></div><div className="preview-task"><b>02</b><span>Create comparison page for an emerging competitor</span></div><div className="preview-task"><b>03</b><span>Publish founder-led distribution experiment</span></div></div><div className="preview-row"><div><span>Memory</span><strong>ICP validated</strong></div><div><span>Activity</span><strong>Agent run saved</strong></div></div></aside>; }
