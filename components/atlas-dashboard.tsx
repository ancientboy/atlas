"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { atlasV2Seed, type Approval, type AtlasV2Data, type Opportunity } from "../lib/atlas-v2-data";
import { workspaceDestination, workspaceErrorMessage } from "../lib/route-state";

type Locale = "zh" | "en";
type View = "today" | "approvals" | "activity" | "opportunities" | "memory" | "agents" | "connections";

const copy = {
  zh: {
    workspace: "工作空间", today: "今日汇报", approvals: "审批队列", activity: "执行记录", opportunities: "增长机会", memory: "公司记忆", agents: "数字员工", connections: "连接", active: "运行中", todayTitle: "Atlas 已经开始工作。", todayLead: "增长执行官正在观察市场、准备执行，并将外部操作交给你审批。", completed: "昨日已完成", planned: "今日计划", waiting: "等待审批", risks: "风险提醒", discoveries: "最新发现", metrics: "关键指标", approve: "批准执行", reject: "拒绝", defer: "稍后处理", viewReason: "查看理由与证据", generated: "已准备内容", evidence: "数据依据", expected: "预期结果", effort: "预计耗时", risk: "风险等级", level: "等级", task: "任务", status: "状态", source: "来源", confidence: "置信度", action: "建议行动", convert: "转为任务", save: "收藏", ignore: "忽略", running: "正在执行", completedLabel: "已完成", failed: "失败", approval: "待审批", cancelled: "已取消", activityLead: "这是 Atlas 可审计的执行记录；只保存数据来源、决策摘要、工具和输出。", memoryLead: "每一条记忆都包含来源、置信度与最后验证时间。", agentLead: "第一阶段只有两位数字员工；后续可以在同一运行环境上扩展。", connectionLead: "外部连接负责提供观察数据与可执行能力。当前未授权连接使用模拟数据。", connected: "已连接", mock: "模拟数据", available: "可连接", pending: "待处理", approved: "已批准", rejected: "已拒绝", deferred: "已延后", auto: "自动化等级", schedule: "运行频率", tools: "可用工具", lastSync: "最近同步", reason: "为什么现在做", approvalQueue: "等待你确认的外部动作", noApprovals: "当前没有等待审批的操作", company: "Project Atlas", role: "增长执行官", observe: "观察", analyze: "分析", plan: "计划", execute: "执行", measure: "衡量", reflect: "复盘", updated: "已更新", approveSuccess: "Atlas 已收到批准，任务已进入执行队列。", rejectSuccess: "该操作已被拒绝，Atlas 不会执行。", deferSuccess: "该操作已延后处理。", opportunitySaved: "机会已加入关注列表。", opportunityIgnored: "机会已忽略。", visits: "访问", signups: "注册", paid: "付费", riskMessage: "等级 2 的操作需要你的批准；Atlas 不会自动发布或修改公开内容。", opportunityLead: "增长执行官主动发现的可参与话题、关键词变化与竞品信号。", success: "成功率", scheduled: "已排程", validated: "已验证", unverified: "待验证", saved: "已收藏", ignored: "已忽略", onboardingTitle: "设置你的产品", onboardingLead: "Atlas 将抓取公开产品页面，生成第一份产品与增长分析。", productName: "产品名称", productUrl: "产品 URL", productIntro: "产品简介（可选）", growthGoal: "当前增长目标（可选）", startAnalysis: "开始分析", analyzing: "正在分析真实网页并写入工作台…", analysisError: "分析失败",
  },
  en: {
    workspace: "WORKSPACE", today: "Today", approvals: "Approval Queue", activity: "Activity", opportunities: "Opportunities", memory: "Memory", agents: "Agents", connections: "Connections", active: "Active", todayTitle: "Atlas is already working.", todayLead: "Growth Operator is observing the market, preparing work, and sending external actions for your approval.", completed: "Completed yesterday", planned: "Today's plan", waiting: "Waiting approval", risks: "Risk notice", discoveries: "Latest discoveries", metrics: "Key metrics", approve: "Approve", reject: "Reject", defer: "Defer", viewReason: "Reason & evidence", generated: "Prepared output", evidence: "Evidence", expected: "Expected outcome", effort: "Estimated effort", risk: "Risk level", level: "Level", task: "Task", status: "Status", source: "Source", confidence: "Confidence", action: "Suggested action", convert: "Create task", save: "Save", ignore: "Ignore", running: "Running", completedLabel: "Completed", failed: "Failed", approval: "Waiting approval", cancelled: "Cancelled", activityLead: "This is Atlas's auditable activity log. It stores data sources, decision summaries, tools, and outputs—not private model reasoning.", memoryLead: "Every memory has a source, confidence score, and last verified time.", agentLead: "Phase one has two digital employees. The same Runtime can later support more agents.", connectionLead: "Connections provide observation data and executable capabilities. Unauthorized connections use mock data.", connected: "Connected", mock: "Mock data", available: "Available", pending: "Pending", approved: "Approved", rejected: "Rejected", deferred: "Deferred", auto: "Autonomy level", schedule: "Schedule", tools: "Tools", lastSync: "Last sync", reason: "Why now", approvalQueue: "External actions waiting for you", noApprovals: "No external actions are waiting for approval", company: "Project Atlas", role: "Growth Operator", observe: "Observe", analyze: "Analyze", plan: "Plan", execute: "Execute", measure: "Measure", reflect: "Reflect", updated: "Updated", approveSuccess: "Atlas received approval and queued the task for execution.", rejectSuccess: "This action was rejected. Atlas will not execute it.", deferSuccess: "This action was deferred.", opportunitySaved: "Opportunity saved to the watch list.", opportunityIgnored: "Opportunity ignored.", visits: "Visits", signups: "Signups", paid: "Paid", riskMessage: "Level 2 actions need your approval. Atlas never publishes or changes public content automatically.", opportunityLead: "Growth Operator proactively finds relevant conversations, keyword movement, and competitor signals.", success: "success", scheduled: "Scheduled", validated: "Validated", unverified: "Unverified", saved: "Saved", ignored: "Ignored", onboardingTitle: "Set up your product", onboardingLead: "Atlas will fetch the public product page and generate the first product and growth analysis.", productName: "Product name", productUrl: "Product URL", productIntro: "Product intro (optional)", growthGoal: "Current growth goal (optional)", startAnalysis: "Start analysis", analyzing: "Analyzing the live website and updating your workspace…", analysisError: "Analysis failed",
  },
} as const;

const nav: { id: View; icon: string; key: keyof typeof copy.zh }[] = [
  { id: "today", icon: "◒", key: "today" }, { id: "approvals", icon: "✓", key: "approvals" }, { id: "activity", icon: "≋", key: "activity" }, { id: "opportunities", icon: "✦", key: "opportunities" }, { id: "memory", icon: "◈", key: "memory" }, { id: "agents", icon: "◎", key: "agents" }, { id: "connections", icon: "↗", key: "connections" },
];

function statusTone(status: string) { return status.replaceAll("_", "-"); }
function riskTone(level: number) { return level === 1 ? "safe" : level === 2 ? "review" : "manual"; }
function statusText(status: string, t: typeof copy.zh) {
  const map: Record<string, string> = { queued: t.pending, running: t.running, waiting_approval: t.approval, approved: t.approved, rejected: t.rejected, completed: t.completedLabel, failed: t.failed, cancelled: t.cancelled, pending: t.pending, deferred: t.deferred, active: t.active, scheduled: t.scheduled, validated: t.validated, unverified: t.unverified, saved: t.saved, ignored: t.ignored };
  return map[status] ?? status;
}

export function AtlasDashboard({ user }: { user?: { displayName: string; email: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>(() => { if (typeof window === "undefined") return "zh"; const saved = window.localStorage.getItem("atlas-locale"); return saved === "zh" || saved === "en" ? saved : "zh"; });
  const [view, setView] = useState<View>("today");
  const [data, setData] = useState<AtlasV2Data>({ ...atlasV2Seed, metrics: { visits: 1240, signups: 68, paid: 5, conversion: 5.5, yesterdayCompleted: 6 } });
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [notice, setNotice] = useState("");
  const t = copy[locale];

  useEffect(() => { window.localStorage.setItem("atlas-locale", locale); }, [locale]);
  async function loadWorkspace() {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/atlas-v2");
      if (response.status === 401) { router.replace("/login?return_to=/app"); return; }
      if (!response.ok) throw new Error(workspaceErrorMessage(locale));
      const payload = await response.json();
      setData(payload);
      const destination = workspaceDestination(payload); if (destination) router.replace(destination);
    } catch {
      setLoadError(workspaceErrorMessage(locale));
    } finally {
      setIsLoading(false);
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { void loadWorkspace(); }, [router]);

  const pendingApprovals = data.approvals.filter((item) => item.status === "pending");
  const todayTasks = data.tasks.filter((item) => ["waiting_approval", "queued", "approved"].includes(item.status)).slice(0, 3);

  async function mutate(action: string, id: number, message: string) {
    const response = await fetch("/api/atlas-v2", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, id }) });
    if (response.ok) { setData(await response.json()); setSelectedApproval(null); setNotice(message); setTimeout(() => setNotice(""), 2600); }
  }

  if (loadError) return <div className="v2-shell v2-centered"><main className="v2-error-card" role="alert"><div className="v2-brand"><span>▲</span><div><strong>ATLAS</strong><small>LUMEWORD AI WORKSPACE</small></div></div><h1>{locale === "zh" ? "工作台暂时无法打开" : "Workspace could not open"}</h1><p>{loadError}</p><button onClick={loadWorkspace}>{locale === "zh" ? "重试" : "Retry"}</button></main></div>;
  if (isLoading || !data.product || data.product.analysisStatus !== "completed") return <div className="v2-shell v2-centered"><main className="v2-error-card"><div className="v2-brand"><span>▲</span><div><strong>ATLAS</strong><small>LUMEWORD AI WORKSPACE</small></div></div><p>{locale === "zh" ? "正在打开你的工作台…" : "Opening your workspace…"}</p></main></div>;

  return <div className={`v2-shell ${mobileNavOpen ? "nav-open" : ""}`} lang={locale === "zh" ? "zh-CN" : "en"}>
    <button className="v2-mobile-menu" onClick={() => setMobileNavOpen(true)}>☰</button>{mobileNavOpen && <button aria-label="Close navigation" className="v2-nav-scrim" onClick={() => setMobileNavOpen(false)} />}
    <aside className="v2-sidebar">
      <div className="v2-brand"><span>▲</span><div><strong>ATLAS</strong><small>{locale === "zh" ? "增长执行官" : "GROWTH OPERATOR"}</small></div></div>
      <p>{t.workspace}</p>
      <nav>{nav.map((item) => <button key={item.id} className={view === item.id ? "selected" : ""} onClick={() => { setView(item.id); setMobileNavOpen(false); }}><i>{item.icon}</i>{t[item.key]}{item.id === "approvals" && pendingApprovals.length > 0 && <b>{pendingApprovals.length}</b>}</button>)}</nav>
      <div className="operator-status"><span className="live" /> <div><strong>{data.product?.name ?? data.agents[0]?.name}</strong><small>{data.product?.url ?? `${t.running} · ${data.agents[0]?.currentTask}`}</small></div></div>
      <div className="v2-sidebar-foot"><span>{t.company}</span><div className="language-switch"><button className={locale === "zh" ? "on" : ""} onClick={() => setLocale("zh")}>中文</button><button className={locale === "en" ? "on" : ""} onClick={() => setLocale("en")}>EN</button></div></div>
    </aside>
    <main className="v2-main">
      <header className="v2-header"><div><span className="breadcrumb">ATLAS / {t[nav.find((item) => item.id === view)?.key ?? "today"]}</span></div><div className="v2-user-menu"><span className="live" /> <strong>{user?.displayName ?? data.product.name}</strong><a href="/signout-with-chatgpt?return_to=/">{locale === "zh" ? "退出" : "Sign out"}</a></div><div className="workflow"><span>{t.observe}</span><i /> <span>{t.analyze}</span><i /> <span>{t.plan}</span><i /> <span>{t.execute}</span><i /> <span>{t.measure}</span><i /> <span>{t.reflect}</span></div></header>
      <div className="v2-content">
        {view === "today" && <Today t={t} data={data} tasks={todayTasks} approvals={pendingApprovals} onSelectApproval={setSelectedApproval} />}
        {view === "approvals" && <Approvals t={t} approvals={data.approvals} tasks={data.tasks} onSelect={setSelectedApproval} />}
        {view === "activity" && <Activity t={t} data={data} />}
        {view === "opportunities" && <Opportunities t={t} items={data.opportunities} onMutate={mutate} />}
        {view === "memory" && <Memory t={t} data={data} />}
        {view === "agents" && <Agents t={t} data={data} />}
        {view === "connections" && <Connections t={t} data={data} />}
      </div>
    </main>
    {selectedApproval && <ApprovalDrawer t={t} approval={selectedApproval} task={data.tasks.find((item) => item.id === selectedApproval.taskId)} onClose={() => setSelectedApproval(null)} onMutate={mutate} />}
    {notice && <div className="v2-toast">{notice}</div>}
  </div>;
}

function Today({ t, data, tasks, approvals, onSelectApproval }: { t: typeof copy.zh; data: AtlasV2Data; tasks: AtlasV2Data["tasks"]; approvals: Approval[]; onSelectApproval: (item: Approval) => void }) {
  return <><section className="today-intro"><div><p>{t.role} · {t.active}</p><h1>{t.todayTitle}</h1><span>{t.todayLead}</span></div><div className="today-summary"><strong>{data.metrics.yesterdayCompleted}</strong><span>{t.completed}</span><i /> <strong>{tasks.length}</strong><span>{t.planned}</span><i /> <strong>{approvals.length}</strong><span>{t.waiting}</span></div></section>
    <section className="today-grid"><div className="today-primary"><Panel title={t.planned} eyebrow="NEXT BEST ACTIONS"><div className="task-stack">{tasks.map((task) => <TaskCard key={task.id} task={task} t={t} />)}</div></Panel><Panel title={t.discoveries} eyebrow="TOP OPPORTUNITY"><div className="discovery-list top-opportunity">{data.opportunities.slice(0, 2).map((item) => <div key={item.id}><span>{item.signal}</span><div><strong>{item.title}</strong><small>{item.summary}</small></div><b>{item.confidence}%</b></div>)}</div></Panel><Panel title={t.activity} eyebrow="RECENT ACTIVITY"><div className="activity-mini">{data.runs.slice(0, 3).map((run) => <div key={run.id}><span className={`run-dot ${statusTone(run.status)}`} /><div><strong>{run.task}</strong><small>{run.startedAt} · {statusText(run.status, t)}</small></div></div>)}</div></Panel></div>
      <aside className="today-side"><Panel title={t.waiting} eyebrow="APPROVAL QUEUE"><div className="approval-mini">{approvals.map((item) => <button key={item.id} onClick={() => onSelectApproval(item)}><span className={`risk ${riskTone(item.riskLevel)}`}>{t.level} {item.riskLevel}</span><strong>{item.title}</strong><small>{item.createdAt} · {item.actionType}</small><i>→</i></button>)}</div></Panel><Panel title={t.metrics} eyebrow="YESTERDAY"><div className="metric-list"><div><span>{t.visits}</span><strong>{data.metrics.visits.toLocaleString()}</strong></div><div><span>{t.signups}</span><strong>{data.metrics.signups}</strong></div><div><span>{t.paid}</span><strong>{data.metrics.paid}</strong></div><div><span>CVR</span><strong>{data.metrics.conversion}%</strong></div></div></Panel><div className="risk-note"><span>!</span><div><strong>{t.risks}</strong><p>{t.riskMessage}</p></div></div></aside></section></>;
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) { return <section className="v2-panel"><header><p>{eyebrow}</p><h2>{title}</h2></header>{children}</section>; }
function TaskCard({ task, t }: { task: AtlasV2Data["tasks"][number]; t: typeof copy.zh }) { return <article className="task-card"><div className="task-order">0{task.priority}</div><div><div className="task-title"><span className={`risk ${riskTone(task.riskLevel)}`}>{t.level} {task.riskLevel}</span><span className={`state ${statusTone(task.status)}`}>{statusText(task.status, t)}</span></div><h3>{task.title}</h3><p>{task.description}</p><footer><span>{t.expected}: <b>{task.expectedOutcome}</b></span><span>◷ {task.estimatedMinutes} min</span></footer></div></article>; }
function Approvals({ t, approvals, tasks, onSelect }: { t: typeof copy.zh; approvals: Approval[]; tasks: AtlasV2Data["tasks"]; onSelect: (item: Approval) => void }) { const pending = approvals.filter((item) => item.status === "pending"); return <><section className="view-title"><p>APPROVAL CONTROL</p><h1>{t.approvals}</h1><span>{t.approvalQueue}</span></section><div className="approval-grid">{pending.length ? pending.map((item) => <article key={item.id} className="approval-card"><div><span className={`risk ${riskTone(item.riskLevel)}`}>{t.level} {item.riskLevel}</span><small>{item.actionType} · {item.createdAt}</small></div><h2>{item.title}</h2><p>{item.reason}</p><pre>{item.payload}</pre><footer><button className="approve" onClick={() => onSelect(item)}>{t.viewReason} →</button><span>{tasks.find((task) => task.id === item.taskId)?.estimatedMinutes} min</span></footer></article>) : <div className="empty-v2">{t.noApprovals}</div>}</div></> }
function Activity({ t, data }: { t: typeof copy.zh; data: AtlasV2Data }) { return <><section className="view-title"><p>AGENT RUNTIME</p><h1>{t.activity}</h1><span>{t.activityLead}</span></section><div className="run-list">{data.runs.map((run) => <article key={run.id}><span className={`run-dot ${statusTone(run.status)}`} /><div><div className="run-meta"><span>{run.startedAt}</span><span>{data.agents.find((agent) => agent.id === run.agentId)?.name}</span><span className={`state ${statusTone(run.status)}`}>{statusText(run.status, t)}</span></div><h2>{run.task}</h2><p>{run.output}</p><footer><span>{t.source}: {run.input}</span><span>{t.tools}: {run.tools.join(" · ")}</span><b>{run.result}</b></footer></div></article>)}</div></> }
function Opportunities({ t, items, onMutate }: { t: typeof copy.zh; items: Opportunity[]; onMutate: (action: string, id: number, message: string) => void }) { return <><section className="view-title"><p>OPPORTUNITY SCAN</p><h1>{t.opportunities}</h1><span>{t.opportunityLead}</span></section><div className="opportunity-grid">{items.map((item) => <article key={item.id}><header><span>{item.signal}</span><b>{item.confidence}% {t.confidence}</b></header><h2>{item.title}</h2><p>{item.summary}</p><footer><small>{item.source} · {item.observedAt}</small><strong>{t.action}: {item.suggestedAction}</strong><div>{item.status === "new" && <><button onClick={() => onMutate("save_opportunity", item.id, t.opportunitySaved)}>{t.save}</button><button onClick={() => onMutate("ignore_opportunity", item.id, t.opportunityIgnored)}>{t.ignore}</button></>}{item.status !== "new" && <span className="state saved">{statusText(item.status, t)}</span>}</div></footer></article>)}</div></> }
function Memory({ t, data }: { t: typeof copy.zh; data: AtlasV2Data }) { return <><section className="view-title"><p>COMPANY MEMORY</p><h1>{t.memory}</h1><span>{t.memoryLead}</span></section><div className="memory-grid">{data.memories.map((item) => <article key={item.id}><header><span>{item.type}</span><span className={`state ${statusTone(item.status)}`}>{statusText(item.status, t)}</span></header><h2>{item.title}</h2><p>{item.content}</p><footer><span>{t.source}: {item.source}</span><b>{item.confidence}% · {item.verifiedAt}</b></footer></article>)}</div></> }
function Agents({ t, data }: { t: typeof copy.zh; data: AtlasV2Data }) { return <><section className="view-title"><p>AGENT RUNTIME</p><h1>{t.agents}</h1><span>{t.agentLead}</span></section><div className="agent-grid">{data.agents.map((agent) => <article key={agent.id}><div className="agent-avatar">{agent.name.slice(0, 1)}</div><div className="agent-heading"><span className={`live ${agent.status === "running" ? "" : "idle"}`} /><small>{statusText(agent.status, t)}</small></div><h2>{agent.name}</h2><p>{agent.role}</p><span className="agent-description">{agent.description}</span><dl><div><dt>{t.auto}</dt><dd>{t.level} {agent.autonomyLevel}</dd></div><div><dt>{t.schedule}</dt><dd>{agent.schedule}</dd></div><div><dt>{t.tools}</dt><dd>{agent.tools.join(" · ")}</dd></div></dl><footer><span>{agent.currentTask}</span><b>{agent.successRate}% {t.success}</b></footer></article>)}</div></> }
function Connections({ t, data }: { t: typeof copy.zh; data: AtlasV2Data }) { return <><section className="view-title"><p>OBSERVE & EXECUTE</p><h1>{t.connections}</h1><span>{t.connectionLead}</span></section><div className="connection-grid">{data.connections.map((item) => <article key={item.id}><div><span>{item.category}</span><b className={item.status}>{item.status === "connected" ? t.connected : item.status === "mock" ? t.mock : t.available}</b></div><h2>{item.name}</h2><p>{item.description}</p><footer>{t.lastSync}: {item.lastSync}</footer></article>)}</div></> }
function ApprovalDrawer({ t, approval, task, onClose, onMutate }: { t: typeof copy.zh; approval: Approval; task?: AtlasV2Data["tasks"][number]; onClose: () => void; onMutate: (action: string, id: number, message: string) => void }) { return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="approval-drawer" onMouseDown={(event) => event.stopPropagation()}><button className="drawer-close" onClick={onClose}>×</button><span className={`risk ${riskTone(approval.riskLevel)}`}>{t.level} {approval.riskLevel}</span><p>APPROVAL REQUEST</p><h2>{approval.title}</h2><section><h3>{t.reason}</h3><span>{approval.reason}</span></section><section><h3>{t.generated}</h3><pre>{approval.payload}</pre></section><section><h3>{t.evidence}</h3><ul>{task?.evidence.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="drawer-action"><button className="approve" onClick={() => onMutate("approve", approval.id, t.approveSuccess)}>{t.approve}</button><button onClick={() => onMutate("defer", approval.id, t.deferSuccess)}>{t.defer}</button><button className="reject" onClick={() => onMutate("reject", approval.id, t.rejectSuccess)}>{t.reject}</button></section></aside></div> }
