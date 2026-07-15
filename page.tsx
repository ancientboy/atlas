"use client";

import { FormEvent, useState } from "react";

const Arrow = ({ diagonal = false }: { diagonal?: boolean }) => (
  <span aria-hidden="true">{diagonal ? "↗" : "→"}</span>
);

const Mark = () => (
  <span className="mark" aria-hidden="true">
    <i />
    <i />
    <i />
  </span>
);

export default function Home() {
  const [submitted, setSubmitted] = useState(false);
  const [locale, setLocale] = useState<"en" | "zh">("en");
  const zh = locale === "zh";
  const tr = (en: string, cn: string) => zh ? cn : en;
  const workspaceUrl = "https://app.lumeword.com";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main lang={zh ? "zh-CN" : "en"}>
      <nav className="nav wrap" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="LumeWord home">
          <Mark />
          <span>LumeWord</span>
        </a>
        <div className="navlinks">
          <a href="#atlas">Atlas</a>
          <a href="#how">{tr("How it works", "工作方式")}</a>
          <a href="#story">{tr("About", "关于我们")}</a>
        </div>
        <div className="nav-actions">
          <div className="locale-switch" aria-label="Language"><button className={!zh ? "active" : ""} onClick={() => setLocale("en")}>EN</button><span>/</span><button className={zh ? "active" : ""} onClick={() => setLocale("zh")}>中文</button></div>
          <a className="login-link" href={workspaceUrl}>{tr("Log in", "登录")}</a>
          <a className="navcta" href="#access">{tr("Get early access", "申请内测")} <Arrow /></a>
        </div>
      </nav>

      <section className="hero wrap" id="top">
        <div className="eyebrow"><span className="pulse" /> {tr("Introducing Atlas · Your first AI employee", "认识 Atlas · 你的第一位 AI 员工")}</div>
        <h1>{tr("Build your company with", "和你的第一位 AI 员工")}<br />{tr("your first ", "一起")}<em>{tr("AI employee.", "建立公司。")}</em></h1>
        <p className="hero-copy">{tr("Atlas learns your product, finds your next growth move, and gets the work done—while you stay focused on building.", "Atlas 会学习你的产品、寻找下一个增长机会并完成工作，让你继续专注于产品本身。")}</p>
        <div className="hero-actions">
          <a className="button dark" href="#access">{tr("Get early access", "申请内测")} <Arrow /></a>
          <a className="button light" href="#how">{tr("See how Atlas works", "了解 Atlas 如何工作")} <span className="play">▶</span></a>
        </div>

        <div className="product-shell" aria-label="Atlas workspace preview">
          <div className="window-bar">
            <div className="window-brand"><Mark /><b>Atlas</b><span>/</span><span>Today</span></div>
            <div className="window-meta"><span className="status-dot" /> Working <span className="avatar">LM</span></div>
          </div>
          <div className="workspace">
            <aside>
              <div className="side-group"><small>WORKSPACE</small><b>⌁ &nbsp; Today <span>4</span></b><p>◌ &nbsp; Opportunities</p><p>✓ &nbsp; Approvals</p></div>
              <div className="side-group"><small>ATLAS</small><p>⌘ &nbsp; Memory</p><p>↯ &nbsp; Activity</p></div>
              <div className="side-bottom"><span className="tiny-avatar">LF</span><div><b>LumeFlow</b><small>Founder workspace</small></div></div>
            </aside>
            <div className="today">
              <div className="today-head"><div><small>TUESDAY, JULY 14</small><h3>Good morning.</h3><p>Here&apos;s what Atlas is working on today.</p></div><span className="working">● Atlas is working</span></div>
              <div className="insight-card">
                <div className="insight-icon">✦</div>
                <div><small>TOP OPPORTUNITY</small><h4>Your launch story is outperforming product updates by 3.2×</h4><p>Atlas found a repeatable narrative pattern across your last 12 posts.</p><button>Review proposed campaign <Arrow /></button></div>
                <div className="score"><b>92</b><small>impact</small></div>
              </div>
              <div className="task-title"><b>Next best actions</b><span>View all 4 <Arrow /></span></div>
              <div className="task-row"><span className="task-icon">⌕</span><div><b>Map 24 high-intent communities</b><small>Research · In progress</small></div><span className="progress"><i /></span></div>
              <div className="task-row"><span className="task-icon">✦</span><div><b>Draft founder-led launch narrative</b><small>Growth · Ready for approval</small></div><button className="review">Review</button></div>
              <div className="task-row muted-row"><span className="task-icon">↗</span><div><b>Publish approved distribution plan</b><small>Execution · Waiting</small></div><span>•••</span></div>
            </div>
          </div>
        </div>
        <div className="trusted"><span>{tr("BUILT FOR THE NEW GENERATION OF", "为新一代创业者而生")}</span><b>{tr("AI FOUNDERS", "AI 创业者")}</b><b>{tr("SOLO DEVELOPERS", "独立开发者")}</b><b>{tr("INDIE HACKERS", "独立创业者")}</b><b>{tr("SMALL TEAMS", "小型团队")}</b></div>
      </section>

      <section className="problem section wrap">
        <span className="section-no">01 — {tr("THE SHIFT", "时代转变")}</span>
        <div className="problem-grid">
          <h2>{tr("Building is no longer", "开发不再是")}<br />{tr("the bottleneck.", "真正的瓶颈。")}<br /><em>{tr("Distribution is.", "分发才是。")}</em></h2>
          <div className="problem-copy"><p>{tr("AI made it possible to build a product in days. But finding the right users, earning attention, and creating repeatable growth still takes everything you have.", "AI 让我们可以在几天内完成产品，但找到真正的用户、赢得注意力并建立可持续增长，仍然需要投入几乎全部精力。")}</p><p>{tr("Atlas changes that. It doesn't give you more tools to manage. It joins your company and does the work.", "Atlas 将改变这一点。它不是又一个需要管理的工具，而是加入你的公司，直接完成工作。")}</p></div>
        </div>
        <div className="old-new"><div><small>{tr("THE OLD WAY", "过去的方式")}</small><p><s>{tr("Build", "开发")}</s></p><p><s>{tr("Research", "调研")}</s></p><p><s>{tr("Plan", "规划")}</s></p><p><s>{tr("Write", "创作")}</s></p><p><s>{tr("Distribute", "分发")}</s></p><p><s>{tr("Analyze", "分析")}</s></p></div><div className="arrow-divider">→</div><div className="new-way"><small>{tr("THE ATLAS WAY", "ATLAS 的方式")}</small><p>{tr("You build.", "你负责创造。")}</p><p><strong>{tr("Atlas grows.", "Atlas 负责增长。")}</strong></p></div></div>
      </section>

      <section className="capabilities section wrap" id="atlas">
        <div className="section-intro"><span className="section-no">02 — {tr("MEET ATLAS", "认识 ATLAS")}</span><h2>{tr("One AI employee.", "一位 AI 员工。")}<br />{tr("Three core capabilities.", "三项核心能力。")}</h2><p>{tr("Atlas operates across the full growth loop—from understanding the market to shipping the next move.", "从理解市场到执行下一步行动，Atlas 覆盖完整的增长闭环。")}</p></div>
        <div className="cap-grid">
          <article><div className="cap-top"><span>01</span><div className="cap-icon">⌕</div></div><h3>{tr("Research", "调研")}</h3><p>{tr("Atlas continuously learns your market, customers, competitors, and emerging opportunities.", "Atlas 持续了解你的市场、客户、竞争对手和新机会。")}</p><ul><li>{tr("Market & competitor intelligence", "市场与竞品情报")}</li><li>{tr("ICP and community discovery", "理想客户与社区发现")}</li><li>{tr("Signal and trend monitoring", "信号与趋势监测")}</li></ul><div className="mini-ui research-ui"><span>{tr("MARKET SIGNAL", "市场信号")}</span><b>{tr("Founder-led content ↗ 42%", "创始人内容 ↗ 42%")}</b><i><u /></i></div></article>
          <article><div className="cap-top"><span>02</span><div className="cap-icon">✦</div></div><h3>{tr("Growth", "增长")}</h3><p>{tr("Atlas turns what it learns into clear strategies, campaigns, and next best actions.", "Atlas 将洞察转化为清晰的策略、活动和下一步最佳行动。")}</p><ul><li>{tr("Positioning and narrative", "定位与叙事")}</li><li>{tr("Content and campaign strategy", "内容与活动策略")}</li><li>{tr("Opportunity prioritization", "机会优先级排序")}</li></ul><div className="mini-ui growth-ui"><span>{tr("NEXT BEST ACTION", "下一步最佳行动")}</span><b>{tr("Launch a founder story series", "发布创始人故事系列")}</b><small>{tr("Impact 92 · Effort Low", "影响力 92 · 工作量低")}</small></div></article>
          <article><div className="cap-top"><span>03</span><div className="cap-icon">↗</div></div><h3>{tr("Execution", "执行")}</h3><p>{tr("Atlas moves beyond advice. It prepares, coordinates, and executes approved work.", "Atlas 不只给建议，还会准备、协调并执行通过审批的工作。")}</p><ul><li>{tr("Multi-channel publishing", "多渠道发布")}</li><li>{tr("Outreach and follow-ups", "外联与跟进")}</li><li>{tr("Performance learning loop", "效果学习闭环")}</li></ul><div className="mini-ui execution-ui"><span>{tr("CAMPAIGN PROGRESS", "活动进度")}</span><b>{tr("8 of 12 tasks complete", "12 项任务已完成 8 项")}</b><i><u /></i></div></article>
        </div>
      </section>

      <section className="how section" id="how">
        <div className="wrap"><div className="section-intro"><span className="section-no">03 — {tr("HOW IT WORKS", "工作方式")}</span><h2>{tr("From product to progress", "从产品到增长")}<br />{tr("in three simple steps.", "只需要三个步骤。")}</h2></div>
          <div className="steps">
            <article><span className="step-num">01</span><div className="step-visual connect"><div className="url-pill"><span>⌁</span> yourproduct.com <b>{tr("Connect", "连接")}</b></div></div><h3>{tr("Connect your product", "连接你的产品")}</h3><p>{tr("Share your product URL and connect the tools your company already uses.", "提交产品网址，并连接公司正在使用的工具。")}</p></article>
            <article><span className="step-num">02</span><div className="step-visual learn"><div className="orbit"><Mark /><i /><i /><i /></div></div><h3>{tr("Atlas learns", "Atlas 开始学习")}</h3><p>{tr("Atlas maps your product, market, audience, voice, and goals into living company memory.", "Atlas 将产品、市场、受众、表达方式和目标沉淀为动态公司记忆。")}</p></article>
            <article><span className="step-num">03</span><div className="step-visual work"><div className="work-list"><span>✓ {tr("Research completed", "调研完成")}</span><span>✓ {tr("Campaign drafted", "活动草案完成")}</span><span className="active">● {tr("Publishing approved posts", "正在发布已审批内容")}</span></div></div><h3>{tr("Atlas works", "Atlas 开始工作")}</h3><p>{tr("Every day, Atlas finds opportunities and executes the highest-impact work.", "Atlas 每天主动发现机会并执行影响力最高的工作。")}</p></article>
          </div>
        </div>
      </section>

      <section className="story section wrap" id="story">
        <div className="story-mark">“</div>
        <div><span className="section-no">04 — {tr("WHY WE'RE BUILDING THIS", "我们为什么做这件事")}</span><blockquote>{tr("AI gave every founder the power to build.", "AI 让每位创业者都有能力创造产品。")}<br /><em>{tr("Now they need the power to grow.", "现在，他们还需要增长的能力。")}</em></blockquote><div className="story-copy"><p>{tr("We watched the cost of building software collapse—but the cost of getting it discovered stayed painfully high.", "我们看到软件开发成本快速下降，但让产品被发现的成本仍然居高不下。")}</p><p>{tr("LumeWord exists to close that gap. We're building autonomous AI companies, starting with the first employee every AI founder needs: one that understands the product, finds the opportunity, and does the work.", "LumeWord 的存在就是为了弥合这道鸿沟。我们正在构建能够自主运转的 AI 公司，第一步是为每位 AI 创业者提供一位理解产品、发现机会并完成工作的 AI 员工。")}</p></div><div className="signature"><Mark /><div><b>{tr("The LumeWord team", "LumeWord 团队")}</b><small>{tr("Building Atlas in public", "公开构建 Atlas")}</small></div></div></div>
      </section>

      <section className="public section">
        <div className="wrap public-grid"><div><span className="section-no">05 — {tr("BUILD IN PUBLIC", "公开构建")}</span><h2>{tr("Watch Atlas learn", "看 Atlas 学会")}<br />{tr("to grow itself.", "推广它自己。")}</h2><p>{tr("Atlas's first company is LumeWord. We're sharing the experiments, decisions, wins, and failures as our first AI employee builds its own path to market.", "Atlas 服务的第一家公司就是 LumeWord。我们会公开分享这位 AI 员工探索市场过程中的实验、决策、成功与失败。")}</p><a href="#access">{tr("Follow the journey", "关注构建过程")} <Arrow diagonal /></a></div><div className="public-feed"><div className="feed-head"><span><Mark /> {tr("Atlas activity", "Atlas 动态")}</span><span className="live">● {tr("LIVE", "实时")}</span></div><div className="feed-item"><span>10:42</span><div><b>{tr("Identified a new distribution channel", "发现新的分发渠道")}</b><p>{tr("Developer tool directories show 2.4× higher conversion for AI infrastructure products.", "开发者工具目录为 AI 基础设施产品带来了 2.4 倍的转化。")}</p></div></div><div className="feed-item"><span>09:18</span><div><b>{tr("Published founder insight #14", "发布创始人洞察 #14")}</b><p>{tr("“Your AI product doesn't need more features. It needs a sharper story.”", "“你的 AI 产品不需要更多功能，它需要一个更清晰的故事。”")}</p><small>↗ 4.8k {tr("impressions", "曝光")} &nbsp; · &nbsp; 126 {tr("engagements", "互动")}</small></div></div><div className="feed-item"><span>{tr("YESTERDAY", "昨天")}</span><div><b>{tr("Completed weekly growth review", "完成每周增长复盘")}</b><p>{tr("3 learnings added to company memory.", "3 条新经验已写入公司记忆。")}</p></div></div></div></div>
      </section>

      <section className="access section wrap" id="access">
        <div className="access-card">
          <div className="access-copy"><span className="section-no">{tr("EARLY ACCESS", "早期访问")}</span><h2>{tr("Your first AI employee", "你的第一位 AI 员工")}<br />{tr("is ready to start.", "已经准备好入职。")}</h2><p>{tr("Join the first group of AI founders building their companies with Atlas.", "加入首批使用 Atlas 建立公司的 AI 创业者。")}</p></div>
          {submitted ? <div className="success"><span>✓</span><div><h3>{tr("You're on the list.", "申请已提交。")}</h3><p>{tr("We'll be in touch when Atlas is ready to meet your product.", "Atlas 准备好了解你的产品时，我们会与你联系。")}</p></div></div> : <form onSubmit={submit}><label>{tr("Email address", "邮箱地址")}<input required type="email" placeholder="you@company.com" aria-label={tr("Email address", "邮箱地址")} /></label><label>{tr("Product URL", "产品网址")}<input required type="url" placeholder="https://yourproduct.com" aria-label={tr("Product URL", "产品网址")} /></label><button type="submit">{tr("Request early access", "申请早期访问")} <Arrow /></button><small>{tr("We'll only use this to learn about your product and contact you about Atlas.", "我们只会使用这些信息了解你的产品，并就 Atlas 与你联系。")}</small></form>}
        </div>
      </section>

      <footer className="wrap"><a className="brand" href="#top"><Mark /><span>LumeWord</span></a><p>{tr("Building autonomous AI companies.", "构建自主运行的 AI 公司。")}</p><div><a href="#atlas">Atlas</a><a href="#story">{tr("About", "关于")}</a><a href="#access">X / Twitter ↗</a></div><small>© 2026 LumeWord, Inc.</small></footer>
    </main>
  );
}
