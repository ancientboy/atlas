"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { atlasV2Seed, type Approval, type AtlasV2Data, type CampaignAsset, type GrowthReflection, type Opportunity } from "../lib/atlas-v2-data";
import type { ProductAnalysisCore } from "../lib/atlas-runtime";
import { campaignTrackingUrl } from "../lib/campaign-tracking";
import { campaignChannelLimit, campaignChannels, type CampaignChannel } from "../lib/campaign-channels";
import { workspaceDestination, workspaceErrorMessage } from "../lib/route-state";
import { AccountMenu } from "./account-menu";

type Locale = "zh" | "en";
type View = "today" | "company-profile" | "routines" | "trust" | "product-intelligence" | "campaigns" | "approvals" | "activity" | "opportunities" | "memory" | "agents" | "connections";

const copy = {
  zh: {
    workspace: "工作空间", today: "今日交接", approvals: "审批队列", activity: "执行记录", opportunities: "增长机会", campaigns: "增长活动", memory: "公司记忆", agents: "数字员工", connections: "连接", active: "运行中", todayTitle: "这是 Atlas 今天的交接。", todayLead: "一个 Company Operator 持续观察、决策、执行与学习；你只需要处理真正需要 Founder 判断的事项。", completed: "已完成", planned: "今日计划", waiting: "等待审批", risks: "风险提醒", discoveries: "最新发现", metrics: "关键指标", approve: "批准执行", reject: "拒绝", defer: "稍后处理", viewReason: "查看理由与证据", generated: "已准备内容", evidence: "数据依据", expected: "预期结果", effort: "预计耗时", risk: "风险等级", level: "等级", task: "任务", status: "状态", source: "来源", confidence: "置信度", action: "建议行动", convert: "转为任务", save: "收藏", ignore: "忽略", running: "正在执行", completedLabel: "已完成", failed: "失败", approval: "待审批", cancelled: "已取消", activityLead: "这是 Atlas 可审计的执行记录；只保存数据来源、决策摘要、工具和输出。", memoryLead: "每一条记忆都包含来源、置信度与最后验证时间。", agentLead: "Atlas 对外是一个员工，增长、产品和销售是它共享记忆的内部职能。", connectionLead: "外部连接负责提供观察数据与可执行能力。当前未授权连接使用模拟数据。", connected: "已连接", mock: "模拟数据", available: "可连接", pending: "待处理", approved: "已批准", rejected: "已拒绝", deferred: "已延后", auto: "自动化等级", schedule: "运行频率", tools: "可用工具", lastSync: "最近同步", reason: "为什么现在做", approvalQueue: "等待你确认的外部动作", noApprovals: "当前没有等待审批的操作", company: "Project Atlas", role: "Company Operator", observe: "观察", analyze: "分析", plan: "计划", execute: "执行", measure: "衡量", reflect: "复盘", updated: "已更新", approveSuccess: "Atlas 已收到批准，内容可以进入发布流程。", rejectSuccess: "该操作已被拒绝，Atlas 会记住你的原因。", deferSuccess: "该操作已延后处理。", opportunitySaved: "机会已加入关注列表。", opportunityIgnored: "机会已忽略。", visits: "访问", signups: "注册", paid: "付费", riskMessage: "公开发布、联系客户和产生费用默认需要批准；低风险内部工作可按信任等级自动执行。", opportunityLead: "Atlas 主动发现的可参与话题、关键词变化与竞品信号。", success: "成功率", scheduled: "已排程", validated: "已验证", unverified: "待验证", saved: "已收藏", ignored: "已忽略", onboardingTitle: "设置你的产品", onboardingLead: "Atlas 将抓取公开产品页面，生成第一份产品与增长分析。", productName: "产品名称", productUrl: "产品 URL", productIntro: "产品简介（可选）", growthGoal: "当前增长目标（可选）", startAnalysis: "开始分析", analyzing: "正在分析真实网页并写入工作台…", analysisError: "分析失败",
  },
  en: {
    workspace: "WORKSPACE", today: "Daily handoff", approvals: "Approval Queue", activity: "Activity", opportunities: "Opportunities", campaigns: "Campaigns", memory: "Memory", agents: "Agents", connections: "Connections", active: "Active", todayTitle: "Your handoff from Atlas.", todayLead: "One Company Operator continuously observes, decides, executes, and learns. You only handle decisions that genuinely need a Founder.", completed: "Completed", planned: "Today's plan", waiting: "Waiting approval", risks: "Risk notice", discoveries: "Latest discoveries", metrics: "Key metrics", approve: "Approve", reject: "Reject", defer: "Defer", viewReason: "Reason & evidence", generated: "Prepared output", evidence: "Evidence", expected: "Expected outcome", effort: "Estimated effort", risk: "Risk level", level: "Level", task: "Task", status: "Status", source: "Source", confidence: "Confidence", action: "Suggested action", convert: "Create task", save: "Save", ignore: "Ignore", running: "Running", completedLabel: "Completed", failed: "Failed", approval: "Waiting approval", cancelled: "Cancelled", activityLead: "This is Atlas's auditable activity log. It stores data sources, decision summaries, tools, and outputs—not private model reasoning.", memoryLead: "Every memory has a source, confidence score, and last verified time.", agentLead: "Atlas is one employee; Growth, Product, and Sales are internal functions sharing the same memory.", connectionLead: "Connections provide observation data and executable capabilities. Unauthorized connections use mock data.", connected: "Connected", mock: "Mock data", available: "Available", pending: "Pending", approved: "Approved", rejected: "Rejected", deferred: "Deferred", auto: "Autonomy level", schedule: "Schedule", tools: "Tools", lastSync: "Last sync", reason: "Why now", approvalQueue: "External actions waiting for you", noApprovals: "No external actions are waiting for approval", company: "Project Atlas", role: "Company Operator", observe: "Observe", analyze: "Analyze", plan: "Plan", execute: "Execute", measure: "Measure", reflect: "Reflect", updated: "Updated", approveSuccess: "Atlas received approval. The content can move into publishing.", rejectSuccess: "This action was rejected and Atlas will remember why.", deferSuccess: "This action was deferred.", opportunitySaved: "Opportunity saved to the watch list.", opportunityIgnored: "Opportunity ignored.", visits: "Visits", signups: "Signups", paid: "Paid", riskMessage: "Public publishing, contacting people, and spending money require approval by default. Low-risk internal work follows action-level trust.", opportunityLead: "Atlas proactively finds relevant conversations, keyword movement, and competitor signals.", success: "success", scheduled: "Scheduled", validated: "Validated", unverified: "Unverified", saved: "Saved", ignored: "Ignored", onboardingTitle: "Set up your product", onboardingLead: "Atlas will fetch the public product page and generate the first product and growth analysis.", productName: "Product name", productUrl: "Product URL", productIntro: "Product intro (optional)", growthGoal: "Current growth goal (optional)", startAnalysis: "Start analysis", analyzing: "Analyzing the live website and updating your workspace…", analysisError: "Analysis failed",
  },
} as const;

const nav: { id: View; icon: string; key: keyof typeof copy.zh; label?: Record<Locale, string> }[] = [
  { id: "today", icon: "◒", key: "today" }, { id: "company-profile", icon: "◇", key: "memory", label: { zh: "公司画像", en: "Company Profile" } }, { id: "routines", icon: "↻", key: "activity", label: { zh: "公司例程", en: "Routines" } }, { id: "trust", icon: "◉", key: "approvals", label: { zh: "信任与学习", en: "Trust & Learning" } }, { id: "product-intelligence", icon: "◫", key: "today", label: { zh: "产品洞察", en: "Product Intelligence" } }, { id: "opportunities", icon: "✦", key: "opportunities" }, { id: "campaigns", icon: "◉", key: "campaigns" }, { id: "approvals", icon: "✓", key: "approvals" }, { id: "activity", icon: "≋", key: "activity" }, { id: "memory", icon: "◈", key: "memory" }, { id: "agents", icon: "◎", key: "agents" }, { id: "connections", icon: "↗", key: "connections" },
];
const channelOptions = Object.entries(campaignChannels) as [CampaignChannel, (typeof campaignChannels)[CampaignChannel]][];

function statusTone(status: string) { return status.replaceAll("_", "-"); }
function riskTone(level: number) { return level === 1 ? "safe" : level === 2 ? "review" : "manual"; }
function statusText(status: string, t: typeof copy.zh) {
  const map: Record<string, string> = { queued: t.pending, retrying: t.pending, running: t.running, waiting_approval: t.approval, approved: t.approved, rejected: t.rejected, completed: t.completedLabel, failed: t.failed, cancelled: t.cancelled, pending: t.pending, deferred: t.deferred, active: t.active, scheduled: t.scheduled, validated: t.validated, unverified: t.unverified, saved: t.saved, ignored: t.ignored };
  return map[status] ?? status;
}

export function AtlasDashboard({ user }: { user?: { displayName: string; email: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>(() => { if (typeof window === "undefined") return "zh"; const saved = window.localStorage.getItem("atlas-locale"); return saved === "zh" || saved === "en" ? saved : "zh"; });
  const [workspaceId, setWorkspaceId] = useState(() => { if (typeof window === "undefined") return ""; return new URLSearchParams(window.location.search).get("workspaceId") || window.localStorage.getItem("atlas-workspace-id") || ""; });
  const [view, setView] = useState<View>(() => { if (typeof window === "undefined") return "today"; const requested = new URLSearchParams(window.location.search).get("view"); return nav.some((item) => item.id === requested) ? requested as View : "today"; });
  const [data, setData] = useState<AtlasV2Data>({ ...atlasV2Seed, metrics: { visits: 1240, signups: 68, paid: 5, conversion: 5.5, yesterdayCompleted: 6 } });
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [notice, setNotice] = useState("");
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
  const [campaignOpportunity, setCampaignOpportunity] = useState<Opportunity | null>(null);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const t = copy[locale];

  useEffect(() => { window.localStorage.setItem("atlas-locale", locale); }, [locale]);
  const appUrl = (nextView: View, id = workspaceId) => `/app?view=${encodeURIComponent(nextView)}${id ? `&workspaceId=${encodeURIComponent(id)}` : ""}`;
  async function loadWorkspace(nextWorkspaceId = workspaceId) {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/atlas-v2${nextWorkspaceId ? `?workspaceId=${encodeURIComponent(nextWorkspaceId)}` : ""}`);
      if (response.status === 401) { router.replace("/login?return_to=/app"); return; }
      if (!response.ok) throw new Error(workspaceErrorMessage(locale));
      const payload = await response.json();
      setData(payload);
      const activeId = payload.workspace?.id || nextWorkspaceId;
      if (activeId) { setWorkspaceId(activeId); window.localStorage.setItem("atlas-workspace-id", activeId); }
      const destination = workspaceDestination(payload); if (destination) router.replace(`/onboarding${activeId ? `?workspaceId=${encodeURIComponent(activeId)}` : ""}`);
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

  async function switchWorkspace(nextWorkspaceId: string) {
    if (!nextWorkspaceId || nextWorkspaceId === workspaceId) return;
    setWorkspaceId(nextWorkspaceId);
    setView("product-intelligence");
    setMobileNavOpen(false);
    window.localStorage.setItem("atlas-workspace-id", nextWorkspaceId);
    window.history.replaceState(null, "", appUrl("product-intelligence", nextWorkspaceId));
    await loadWorkspace(nextWorkspaceId);
  }

  async function mutate(action: string, id: number, message: string, extra: Record<string, unknown> = {}) {
    const response = await fetch(`/api/atlas-v2${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, id, ...extra }) });
    if (response.ok) {
      const approvedCampaignAsset = action === "approve" && selectedApproval?.id === id && selectedApproval.actionType === "campaign_asset_publish";
      setData(await response.json()); setSelectedApproval(null);
      if (approvedCampaignAsset) { setView("campaigns"); window.history.replaceState(null, "", appUrl("campaigns")); }
      setNotice(approvedCampaignAsset ? (locale === "zh" ? "内容已批准，已进入内容工作室的待发布区。" : "Content approved and moved to Publish ready in Content Studio.") : message);
      setTimeout(() => setNotice(""), 3200);
    }
  }

  async function deleteWorkspace() {
    const current = data.workspaces?.find((item) => item.id === workspaceId);
    const name = current?.productName || current?.name || data.product?.name || "Workspace";
    const confirmed = window.confirm(locale === "zh" ? `确定删除“${name}”工作区吗？产品洞察、任务、记忆和机会将永久删除。` : `Delete the “${name}” workspace? Product intelligence, tasks, memories, and opportunities will be permanently deleted.`);
    if (!confirmed) return;
    setIsDeletingWorkspace(true);
    try {
      const response = await fetch(`/api/atlas-v2?workspaceId=${encodeURIComponent(workspaceId)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "delete_workspace" }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(payload.error || (locale === "zh" ? "无法删除工作区，请稍后重试。" : "Unable to delete the workspace. Please retry.")); return; }
      const nextId = payload.nextWorkspaceId || "";
      if (nextId) window.localStorage.setItem("atlas-workspace-id", nextId); else window.localStorage.removeItem("atlas-workspace-id");
      window.location.assign(`/app?view=product-intelligence${nextId ? `&workspaceId=${encodeURIComponent(nextId)}` : ""}`);
    } finally {
      setIsDeletingWorkspace(false);
    }
  }

  async function createCampaign(objective: string, channels: string[]) {
    if (!campaignOpportunity) return;
    setIsGeneratingCampaign(true);
    try {
      const response = await fetch(`/api/atlas-v2?workspaceId=${encodeURIComponent(workspaceId)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_campaign", opportunityId: campaignOpportunity.id, objective, channels, locale }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setNotice(payload.error || (locale === "zh" ? "Campaign 生成失败，请重试。" : "Campaign generation failed. Please retry.")); return; }
      setData(payload); setCampaignOpportunity(null); setView("campaigns"); window.history.replaceState(null, "", appUrl("campaigns")); setNotice(locale === "zh" ? "Campaign 已生成，内容正在等待审批。" : "Campaign generated. Content is waiting for approval.");
    } finally { setIsGeneratingCampaign(false); }
  }

  async function campaignAssetAction(action: string, asset: CampaignAsset, payload: Record<string, unknown> = {}) {
    const response = await fetch(`/api/atlas-v2?workspaceId=${encodeURIComponent(workspaceId)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, id: asset.id, ...payload }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) { setData(result); setNotice(locale === "zh" ? "Campaign 已更新。" : "Campaign updated."); } else setNotice(result.error || (locale === "zh" ? "更新失败。" : "Update failed."));
  }

  async function setAutonomyEnabled(enabled: boolean) {
    const response = await fetch(`/api/atlas-v2?workspaceId=${encodeURIComponent(workspaceId)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "set_workspace_autonomy", enabled }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      setData(result);
      setNotice(enabled ? (locale === "zh" ? "自动执行已开启。" : "Automation enabled.") : (locale === "zh" ? "自动执行已关闭，后台队列已暂停。" : "Automation disabled and queued work paused."));
      setTimeout(() => setNotice(""), 3200);
    } else setNotice(result.error || (locale === "zh" ? "无法更新自动执行开关。" : "Could not update automation."));
  }

  if (loadError) return <div className="v2-shell v2-centered"><main className="v2-error-card" role="alert"><div className="v2-brand"><span>▲</span><div><strong>ATLAS</strong><small>LUMEWORD AI WORKSPACE</small></div></div><h1>{locale === "zh" ? "工作台暂时无法打开" : "Workspace could not open"}</h1><p>{loadError}</p><button onClick={() => void loadWorkspace()}>{locale === "zh" ? "重试" : "Retry"}</button></main></div>;
  if (isLoading || !data.product || data.product.analysisStatus !== "completed") return <div className="v2-shell v2-centered"><main className="v2-error-card"><div className="v2-brand"><span>▲</span><div><strong>ATLAS</strong><small>LUMEWORD AI WORKSPACE</small></div></div><p>{locale === "zh" ? "正在打开你的工作台…" : "Opening your workspace…"}</p></main></div>;

  return <div className={`v2-shell ${mobileNavOpen ? "nav-open" : ""}`} lang={locale === "zh" ? "zh-CN" : "en"}>
    <button className="v2-mobile-menu" onClick={() => setMobileNavOpen(true)}>☰</button>{mobileNavOpen && <button aria-label="Close navigation" className="v2-nav-scrim" onClick={() => setMobileNavOpen(false)} />}
    <aside className="v2-sidebar">
      <div className="v2-brand"><span>▲</span><div><strong>ATLAS</strong><small>COMPANY OPERATOR</small></div></div>
      <div className="workspace-switcher"><label>{locale === "zh" ? "当前产品" : "CURRENT PRODUCT"}</label><select aria-label={locale === "zh" ? "切换产品工作台" : "Switch product workspace"} value={workspaceId} onChange={(event) => void switchWorkspace(event.target.value)}>{(data.workspaces ?? []).map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.productName || workspace.name}</option>)}</select><div><a href="/onboarding?new=1">＋ {locale === "zh" ? "添加产品" : "Add product"}</a><button className="delete-workspace" type="button" disabled={isDeletingWorkspace} onClick={() => void deleteWorkspace()}>{isDeletingWorkspace ? "…" : locale === "zh" ? "删除" : "Delete"}</button></div></div>
      <p>{t.workspace}</p>
      <nav>{nav.map((item) => <button key={item.id} className={view === item.id ? "selected" : ""} onClick={() => { setView(item.id); window.history.replaceState(null, "", appUrl(item.id)); setMobileNavOpen(false); }}><i>{item.icon}</i>{item.label?.[locale] ?? t[item.key]}{item.id === "approvals" && pendingApprovals.length > 0 && <b>{pendingApprovals.length}</b>}</button>)}</nav>
      <div className="operator-status"><span className="live" /> <div><strong>{data.product?.name ?? data.agents[0]?.name}</strong><small>{data.product?.url ?? `${t.running} · ${data.agents[0]?.currentTask}`}</small></div></div>
      <div className="v2-sidebar-foot"><AccountMenu initialName={user?.displayName ?? data.product.name} email={user?.email ?? ""} locale={locale} onLocaleChange={setLocale} /></div>
    </aside>
    <main className="v2-main">
      <header className="v2-header"><div><span className="breadcrumb">ATLAS / {nav.find((item) => item.id === view)?.label?.[locale] ?? t[nav.find((item) => item.id === view)?.key ?? "today"]}</span></div><div className="workflow"><span>{t.observe}</span><i /> <span>{t.analyze}</span><i /> <span>{t.plan}</span><i /> <span>{t.execute}</span><i /> <span>{t.measure}</span><i /> <span>{t.reflect}</span></div></header>
      <div className="v2-content">
        {view === "today" && <Today t={t} data={data} tasks={todayTasks} approvals={pendingApprovals} onSelectApproval={setSelectedApproval} onReflect={() => mutate("run_daily_reflection", 0, locale === "zh" ? "今日增长快照和计划已刷新。" : "Today's growth snapshot and plan were refreshed.")} onObserve={() => mutate("run_observation_scan", 0, locale === "zh" ? "观察源已刷新，新信号会进入下一次决策。" : "Observation sources refreshed. New signals will enter the next decision.")} onRunRuntime={() => mutate("run_company_runtime", 0, locale === "zh" ? "Company Runtime 已完成本轮工作。" : "Company Runtime completed this cycle.")} onToggleAutonomy={setAutonomyEnabled} />}
        {view === "company-profile" && <CompanyProfile locale={locale} data={data} onMutate={mutate} />}
        {view === "routines" && <CompanyRoutines locale={locale} data={data} onMutate={mutate} />}
        {view === "trust" && <TrustAndLearning locale={locale} data={data} onMutate={mutate} />}
        {view === "product-intelligence" && <ProductIntelligence locale={locale} data={data} />}
        {view === "approvals" && <Approvals t={t} approvals={data.approvals} tasks={data.tasks} onSelect={setSelectedApproval} />}
        {view === "activity" && <Activity t={t} data={data} />}
        {view === "opportunities" && <Opportunities t={t} items={data.opportunities} onMutate={mutate} onCreateCampaign={setCampaignOpportunity} />}
        {view === "campaigns" && <Campaigns locale={locale} data={data} onAssetAction={campaignAssetAction} onOpenApprovals={() => { setView("approvals"); window.history.replaceState(null, "", appUrl("approvals")); }} />}
        {view === "memory" && <Memory t={t} data={data} />}
        {view === "agents" && <Agents t={t} data={data} />}
        {view === "connections" && <Connections t={t} data={data} onReflect={() => mutate("run_daily_reflection", 0, locale === "zh" ? "今日增长快照和复盘已更新。" : "Today's growth snapshot and reflection were updated.")} />}
      </div>
    </main>
    {selectedApproval && <ApprovalDrawer t={t} approval={selectedApproval} task={data.tasks.find((item) => item.id === selectedApproval.taskId)} onClose={() => setSelectedApproval(null)} onMutate={mutate} />}
    {campaignOpportunity && <CampaignComposer locale={locale} opportunity={campaignOpportunity} busy={isGeneratingCampaign} onClose={() => setCampaignOpportunity(null)} onCreate={createCampaign} />}
    {notice && <div className="v2-toast">{notice}</div>}
  </div>;
}

function localizedAnalysis(data: AtlasV2Data, locale: Locale): ProductAnalysisCore | null {
  const analysis = data.product?.analysis;
  if (!analysis) return null;
  if (analysis.contentLanguage && analysis.contentLanguage !== locale && analysis.translation) return analysis.translation;
  return analysis;
}

function ProductIntelligence({ locale, data }: { locale: Locale; data: AtlasV2Data }) {
  const analysis = localizedAnalysis(data, locale);
  const zh = locale === "zh";
  const tr = (en: string, cn: string) => zh ? cn : en;
  if (!analysis) return <section className="view-title"><p>PRODUCT INTELLIGENCE</p><h1>{tr("Product Intelligence", "产品洞察")}</h1><span>{tr("No completed analysis is available yet.", "暂时没有已完成的产品分析。")}</span></section>;
  const originalLanguage = data.product?.analysis?.contentLanguage;
  const isLegacyLanguage = !originalLanguage && zh;
  return <div className="intelligence-report">
    <section className="intelligence-hero">
      <div><p>PRODUCT INTELLIGENCE · {data.product?.name}</p><h1>{tr("Your product, understood.", "Atlas 已理解你的产品。")}</h1><span>{analysis.summary}</span></div>
      <aside><span>{tr("SOURCE", "分析来源")}</span><a href={data.product?.url} target="_blank" rel="noreferrer">{data.product?.url} ↗</a><b>{isLegacyLanguage ? tr("Legacy report · English content", "历史报告 · 仅英文内容") : tr("Bilingual report", "中英文双语报告")}</b></aside>
    </section>
    <section className="intelligence-foundation">
      <article><span>01 · {tr("VALUE PROPOSITION", "价值主张")}</span><p>{analysis.valueProposition}</p></article>
      <article><span>02 · ICP</span><p>{analysis.icp}</p></article>
    </section>
    <section className="intelligence-grid">
      <IntelligenceList index="03" title={tr("Pain points", "核心痛点")} items={analysis.pains} />
      <IntelligenceList index="04" title={tr("Use cases", "使用场景")} items={analysis.useCases} />
      <IntelligenceList index="05" title={tr("Competitors", "竞品格局")} items={analysis.competitors} />
      <IntelligenceList index="06" title={tr("Channels", "增长渠道")} items={analysis.channels} />
    </section>
    <section className="intelligence-actions">
      <header><div><p>07 · NEXT BEST ACTIONS</p><h2>{tr("Recommended next moves", "全部行动建议")}</h2></div><span>{tr("Prioritized by Atlas", "由 Atlas 按优先级排序")}</span></header>
      <div>{analysis.nextBestActions.map((action, index) => <article key={`${action.title}-${index}`}><b>0{index + 1}</b><div><h3>{action.title}</h3><p>{action.description}</p><strong>{tr("Expected outcome", "预期结果")}: {action.expectedOutcome}</strong></div></article>)}</div>
    </section>
    <section className="intelligence-opportunities">
      <header><p>08 · OPPORTUNITIES</p><h2>{tr("Opportunity map", "机会地图")}</h2></header>
      <div>{analysis.opportunities.map((item, index) => <article key={`${item.title}-${index}`}><div><span>{item.signal}</span><b>{item.confidence}%</b></div><h3>{item.title}</h3><p>{item.summary}</p><strong>{tr("Suggested action", "建议行动")}: {item.suggestedAction}</strong></article>)}</div>
    </section>
  </div>;
}

function IntelligenceList({ index, title, items }: { index: string; title: string; items: string[] }) {
  return <article><header><span>{index}</span><h2>{title}</h2></header><ul>{items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}><b>{String(itemIndex + 1).padStart(2, "0")}</b><span>{item}</span></li>)}</ul></article>;
}

function Today({ t, data, tasks, approvals, onSelectApproval, onReflect, onObserve, onRunRuntime, onToggleAutonomy }: { t: typeof copy.zh; data: AtlasV2Data; tasks: AtlasV2Data["tasks"]; approvals: Approval[]; onSelectApproval: (item: Approval) => void; onReflect: () => Promise<void>; onObserve: () => Promise<void>; onRunRuntime: () => Promise<void>; onToggleAutonomy: (enabled: boolean) => Promise<void> }) {
  const zh = t.workspace === copy.zh.workspace;
  const latest = data.growthSnapshots?.[0];
  const reflection = latest?.reflection;
  const runtimeSchedule = data.runtime?.schedule;
  const latestJob = data.runtime?.jobs?.[0];
  const companyRuntime = data.companyRuntime;
  const companyCycle = companyRuntime?.latestCycle;
  const companySettings = companyRuntime?.settings;
  const intelligence = data.companyIntelligence;
  return <><section className="today-intro"><div><p>{t.role} · {t.active}</p><h1>{t.todayTitle}</h1><span>{t.todayLead}</span></div><div className="today-summary"><strong>{data.metrics.yesterdayCompleted}</strong><span>{t.completed}</span><i /> <strong>{tasks.length}</strong><span>{t.planned}</span><i /> <strong>{approvals.length}</strong><span>{t.waiting}</span></div></section>
    {data.handoff && <section className="founder-handoff"><header><div><span className={`operator-orb ${data.handoff.status}`}><i /></span><div><small>ATLAS STATUS · {data.handoff.status.replaceAll("_", " ")}</small><strong>{data.handoff.statusDetail}</strong></div></div><b>{zh ? "只把真正需要你的决定带到这里" : "Only decisions that truly need you appear here"}</b></header><div className="handoff-grid"><article><span>01 · {zh ? "我完成了" : "I completed"}</span>{data.handoff.completed.length ? data.handoff.completed.slice(0, 3).map((item) => <p key={item.id}>✓ {item.title}</p>) : <p>{zh ? "等待首个已完成动作。" : "Waiting for the first completed action."}</p>}</article><article><span>02 · {zh ? "我发现了" : "I discovered"}</span>{data.handoff.discoveries.slice(0, 2).map((item) => <p key={item.id}><b>{item.confidence}%</b> {item.title}</p>)}</article><article><span>03 · {zh ? "接下来我会做" : "What I will do next"}</span>{data.handoff.plan.length ? data.handoff.plan.map((item) => <p key={item.id}>→ {item.title}</p>) : <p>{zh ? "持续观察，等待足够证据。" : "Keep observing until evidence is strong enough."}</p>}</article><article className={data.handoff.founderDecision ? "needs-founder" : ""}><span>04 · {zh ? "今天需要你决定" : "Your one decision"}</span>{data.handoff.founderDecision ? <button onClick={() => { const approval = approvals.find((item) => item.id === data.handoff?.founderDecision?.id); if (approval) onSelectApproval(approval); }}><strong>{data.handoff.founderDecision.title}</strong><small>{data.handoff.founderDecision.reason}</small><i>→</i></button> : <p>✓ {zh ? "今天无需处理，Atlas 会继续工作。" : "Nothing needed today. Atlas keeps working."}</p>}</article></div></section>}
    <section className="company-runtime-status"><div><span className="live" /><div><small>COMPANY RUNTIME</small><strong>{companySettings?.mode === "paused" ? (zh ? "已由 Founder 暂停" : "Paused by founder") : (zh ? "Atlas 正在经营公司" : "Atlas is operating the company")}</strong><p>{companyCycle?.summary || (zh ? "点击立即运行，启动首个统一公司运营周期。" : "Run the first unified company cycle when you are ready.")}</p></div></div><dl><div><dt>{zh ? "模式" : "Mode"}</dt><dd>{companySettings?.mode ?? "copilot"}</dd></div><div><dt>{zh ? "今日动作" : "Actions today"}</dt><dd>{companyRuntime?.usage.actionsCount ?? 0}/{companySettings?.dailyActionLimit ?? 0}</dd></div><div><dt>{zh ? "下次运行" : "Next run"}</dt><dd>{companySettings?.nextTickAt ? new Date(companySettings.nextTickAt).toLocaleTimeString(zh ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }) : (zh ? "待调度" : "Awaiting scheduler")}</dd></div></dl><button onClick={() => void onRunRuntime()}>{zh ? "立即运行" : "Run now"}</button></section>
    {intelligence && <section className="company-intelligence-status"><div><small>COMPANY INTELLIGENCE</small><strong>{zh ? "目标进展与数据健康度" : "Goal progress & data health"}</strong><p>{intelligence.summary}</p></div><dl><div><dt>{zh ? "健康度" : "Health"}</dt><dd>{intelligence.healthScore}/100</dd></div><div><dt>{intelligence.metricName ?? (zh ? "指标" : "Metric")}</dt><dd>{intelligence.metricValue ?? "—"} {typeof intelligence.metricDelta === "number" && <small>{intelligence.metricDelta >= 0 ? "+" : ""}{intelligence.metricDelta}</small>}</dd></div><div><dt>{zh ? "当前目标" : "Active goal"}</dt><dd>{companyRuntime?.goals[0]?.title ?? "—"}</dd></div></dl></section>}
    <OperatingLoopStatus data={data} zh={zh} />
    <section className={`runtime-health ${runtimeSchedule?.lastStatus === "failed" || latestJob?.status === "failed" ? "has-error" : ""}`}><div><span className="live" /><div><small>BACKGROUND GROWTH RUNTIME</small><strong>{runtimeSchedule ? (zh ? `每日 ${runtimeSchedule.localTime} · ${runtimeSchedule.timezone}` : `Daily ${runtimeSchedule.localTime} · ${runtimeSchedule.timezone}`) : (zh ? "正在初始化后台计划" : "Initializing background schedule")}</strong></div></div><dl><div><dt>{zh ? "自动执行" : "Automation"}</dt><dd><button className={`autonomy-toggle ${data.workspace?.autonomyEnabled === false ? "off" : ""}`} onClick={() => void onToggleAutonomy(data.workspace?.autonomyEnabled === false)}>{data.workspace?.autonomyEnabled === false ? (zh ? "关闭" : "Off") : (zh ? "开启" : "On")}</button></dd></div><div><dt>{zh ? "上次运行" : "Last run"}</dt><dd>{runtimeSchedule?.lastRunAt ? new Date(runtimeSchedule.lastRunAt).toLocaleString(zh ? "zh-CN" : "en-US") : (zh ? "尚未运行" : "Not run yet")}</dd></div><div><dt>{zh ? "最新任务" : "Latest job"}</dt><dd className={`state ${statusTone(latestJob?.status ?? runtimeSchedule?.lastStatus ?? "scheduled")}`}>{statusText(latestJob?.status ?? runtimeSchedule?.lastStatus ?? "scheduled", t)}</dd></div></dl>{(runtimeSchedule?.lastError || latestJob?.lastError) && <p>{zh ? "后台任务失败，Atlas 会按照重试策略安全恢复。" : "The background job failed and will recover through the retry policy."}</p>}</section>
    <ObservationHealth data={data} zh={zh} onScan={onObserve} />
    <AnalyticsHealth data={data} zh={zh} />
    <section className="today-grid"><div className="today-primary">{reflection && <FounderDailyBrief reflection={reflection} date={latest.snapshotDate} zh={zh} onReflect={onReflect} />}<Panel title={t.planned} eyebrow="NEXT BEST ACTIONS"><div className="task-stack">{tasks.map((task) => <TaskCard key={task.id} task={task} t={t} />)}</div></Panel><Panel title={t.discoveries} eyebrow="TOP OPPORTUNITY"><div className="discovery-list top-opportunity">{data.opportunities.slice(0, 2).map((item) => <div key={item.id}><span>{item.signal}</span><div><strong>{item.title}</strong><small>{item.summary}</small></div><b>{item.confidence}%</b></div>)}</div></Panel><Panel title={t.activity} eyebrow="RECENT ACTIVITY"><div className="activity-mini">{data.runs.slice(0, 3).map((run) => <div key={run.id}><span className={`run-dot ${statusTone(run.status)}`} /><div><strong>{run.task}</strong><small>{run.startedAt} · {statusText(run.status, t)}</small></div></div>)}</div></Panel></div>
      <aside className="today-side"><Panel title={t.waiting} eyebrow="APPROVAL QUEUE"><div className="approval-mini">{approvals.map((item) => <button key={item.id} onClick={() => onSelectApproval(item)}><span className={`risk ${riskTone(item.riskLevel)}`}>{t.level} {item.riskLevel}</span><strong>{item.title}</strong><small>{item.createdAt} · {item.actionType}</small><i>→</i></button>)}</div></Panel><Panel title={t.metrics} eyebrow="YESTERDAY"><div className="metric-list"><div><span>{t.visits}</span><strong>{data.metrics.visits.toLocaleString()}</strong></div><div><span>{t.signups}</span><strong>{data.metrics.signups}</strong></div><div><span>{t.paid}</span><strong>{data.metrics.paid}</strong></div><div><span>CVR</span><strong>{data.metrics.conversion}%</strong></div></div></Panel><div className="risk-note"><span>!</span><div><strong>{t.risks}</strong><p>{t.riskMessage}</p></div></div></aside></section></>;
}

function OperatingLoopStatus({ data, zh }: { data: AtlasV2Data; zh: boolean }) {
  const functions = data.companyFunctions ?? [];
  const experiments = data.companyBrain?.experiments ?? [];
  const performance = data.companyBrain?.strategyPerformance ?? [];
  const completed = experiments.filter((item) => item.status === "completed");
  const latestResult = completed.find((item) => item.outcome);
  const suppressed = performance.filter((item) => item.suppressedUntil && new Date(item.suppressedUntil) > new Date());
  const heartbeat = data.companyRuntime?.heartbeat;
  const heartbeatStale = Boolean(heartbeat?.stale);
  if (!functions.length && !experiments.length && !heartbeat) return null;
  const labels: Record<string, { zh: string; en: string }> = {
    growth: { zh: "增长", en: "Growth" },
    product: { zh: "产品", en: "Product" },
    sales: { zh: "销售", en: "Sales" },
  };
  return <section className="operating-loop-status">
    <header><div><small>COMPANY OPERATING LOOP</small><strong>{zh ? "一个 Atlas，三个公司职能，共享同一套记忆与学习" : "One Atlas, three company functions, one shared learning loop"}</strong></div><span className={`state ${heartbeatStale ? "failed" : heartbeat?.status === "healthy" ? "completed" : "scheduled"}`}>{heartbeatStale ? (zh ? "调度待恢复" : "Scheduler stale") : heartbeat?.status === "healthy" ? (zh ? "持续运行" : "Running continuously") : (zh ? "等待首次心跳" : "Awaiting heartbeat")}</span></header>
    <div className="company-function-grid">{functions.map((item) => <article key={item.functionKey}><div><span>{labels[item.functionKey]?.[zh ? "zh" : "en"] ?? item.functionKey}</span><b>{item.confidence}%</b></div><strong>{item.summary}</strong><p>{item.nextAction}</p><small>{item.metricName ?? "signal"} · {item.metricValue ?? "—"}</small></article>)}</div>
    <footer><span>{zh ? "实验闭环" : "Experiment loop"} <b>{completed.length}/{experiments.length}</b></span><span>{latestResult ? `${latestResult.strategyKey}: ${latestResult.outcome}` : (zh ? "等待首个可判定结果" : "Waiting for first measured result")}</span><span>{suppressed.length ? (zh ? `${suppressed.length} 条失败策略已暂停` : `${suppressed.length} failed strategy path(s) suppressed`) : (zh ? "没有被抑制的策略" : "No suppressed strategy")}</span></footer>
  </section>;
}

function AnalyticsHealth({ data, zh }: { data: AtlasV2Data; zh: boolean }) {
  const connection = data.platformConnections?.find((item) => item.provider === "posthog" && item.status === "connected");
  if (!connection) return null;
  const failed = connection.metadata.lastStatus === "failed";
  return <section className={`analytics-health ${failed ? "has-error" : ""}`}><div><span className="live" /><div><small>POSTHOG · GROWTH METRICS</small><strong>{zh ? "真实访问、注册与付费数据已接入" : "Live visits, signups, and paid metrics connected"}</strong></div></div><div><span>{zh ? "最近同步" : "Last sync"}</span><b>{connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString(zh ? "zh-CN" : "en-US") : (zh ? "等待首次同步" : "Waiting for first sync")}</b>{failed && <small>{zh ? "同步失败，后台将安全重试" : "Sync failed; the runtime will retry safely"}</small>}</div></section>;
}

function ObservationHealth({ data, zh, onScan }: { data: AtlasV2Data; zh: boolean; onScan: () => Promise<void> }) {
  const [scanning, setScanning] = useState(false);
  const sources = data.observationEngine?.sources ?? [];
  const insights = data.observationEngine?.insights ?? [];
  const run = async () => { setScanning(true); try { await onScan(); } finally { setScanning(false); } };
  return <section className="observation-health"><header><div><p>OBSERVATION ENGINE</p><h2>{zh ? "Atlas 正在观察什么" : "What Atlas is observing"}</h2></div><button disabled={scanning} onClick={() => void run()}>{scanning ? (zh ? "扫描中…" : "Scanning…") : (zh ? "立即扫描" : "Scan now")}</button></header>
    <div className="observation-source-grid">{sources.length ? sources.map((source) => <article key={source.id} className={source.status === "degraded" ? "degraded" : ""}><div><span className="live" /><strong>{source.name}</strong><b>{source.lastStatus === "changed" ? (zh ? "发现变化" : "Changed") : source.lastStatus === "failed" ? (zh ? "等待重试" : "Retrying") : (zh ? "观察中" : "Watching")}</b></div><small>{source.sourceType.toUpperCase()} · {zh ? `每 ${Math.round(source.cadenceMinutes / 60)} 小时` : `Every ${Math.round(source.cadenceMinutes / 60)}h`}</small><p>{source.lastCheckedAt ? (zh ? `上次检查 ${new Date(source.lastCheckedAt).toLocaleString("zh-CN")}` : `Last checked ${new Date(source.lastCheckedAt).toLocaleString("en-US")}`) : (zh ? "等待首次扫描" : "Waiting for first scan")}</p></article>) : <article className="observation-empty"><strong>{zh ? "观察源正在初始化" : "Observation sources are initializing"}</strong><p>{zh ? "首次扫描会自动添加产品网站，并尝试发现公开 GitHub 仓库。" : "The first scan adds the product website and tries to discover a public GitHub repository."}</p></article>}</div>
    {insights.length > 0 && <div className="observation-insights"><small>{zh ? "最新洞察" : "LATEST INSIGHTS"}</small>{insights.slice(0, 3).map((insight) => <div key={insight.id}><span>{insight.insightType.replaceAll("_", " ")}</span><strong>{insight.title}</strong><p>{insight.summary}</p><b>{insight.confidence}%</b></div>)}</div>}
  </section>;
}

function FounderDailyBrief({ reflection, date, zh, onReflect }: { reflection: GrowthReflection; date: string; zh: boolean; onReflect: () => Promise<void> }) {
  const brief = reflection.localized?.[zh ? "zh" : "en"];
  const plan = reflection.decision;
  const summary = brief?.summary ?? reflection.summary;
  const nextAction = brief?.nextAction ?? reflection.nextAction;
  return <section className="daily-brief founder-daily-brief">
    <header><div><p>FOUNDER DAILY BRIEF</p><h2>{zh ? "Atlas 创始人晨报" : "Atlas Founder Daily Brief"}</h2></div><div className="brief-meta"><span>{date}</span>{plan && <b>{zh ? `决策置信度 ${plan.confidence}%` : `${plan.confidence}% decision confidence`}</b>}</div></header>
    <p className="brief-summary">{summary}</p>
    <div className="reflection-signals"><span>{zh ? "曝光" : "Impressions"}<b>{reflection.signals.impressions.toLocaleString()}</b></span><span>{zh ? "点击" : "Clicks"}<b>{reflection.signals.clicks.toLocaleString()}</b></span><span>{zh ? "转化" : "Conversions"}<b>{reflection.signals.conversions.toLocaleString()}</b></span><span>CTR<b>{reflection.signals.ctr ?? 0}%</b></span></div>
    {brief ? <div className="brief-columns">
      <article><small>{zh ? "昨天" : "YESTERDAY"}</small><ul>{brief.yesterday.slice(0, 3).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></article>
      <article><small>{zh ? "Atlas 的发现" : "DISCOVERED"}</small>{brief.discoveries.length ? <ul>{brief.discoveries.slice(0, 2).map((item, index) => <li key={`${item.title}-${index}`}><strong>{item.title}</strong><span>{item.source} · {item.confidence}%</span></li>)}</ul> : <p>{zh ? "尚无新的外部发现。" : "No new external discovery yet."}</p>}</article>
      <article><small>{zh ? "今天" : "TODAY"}</small><ol>{brief.today.slice(0, 3).map((item) => <li key={`${item.priority}-${item.title}`}><b>0{item.priority}</b><span><strong>{item.title}</strong><small>{item.why}</small></span></li>)}</ol></article>
    </div> : reflection.learnings?.length ? <ul>{reflection.learnings.map((item) => <li key={item}>{item}</li>)}</ul> : null}
    <footer><div><small>{zh ? "下一步最应该做" : "NEXT BEST ACTION"}</small><strong>{nextAction}</strong>{brief?.today[0] && <span>{brief.today[0].expectedOutcome}</span>}</div><button onClick={() => void onReflect()}>{zh ? "重新生成晨报" : "Refresh brief"}</button></footer>
    {brief && <p className="brief-risk">{brief.risk}</p>}
  </section>;
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) { return <section className="v2-panel"><header><p>{eyebrow}</p><h2>{title}</h2></header>{children}</section>; }
function TaskCard({ task, t }: { task: AtlasV2Data["tasks"][number]; t: typeof copy.zh }) { return <article className="task-card"><div className="task-order">0{task.priority}</div><div><div className="task-title"><span className={`risk ${riskTone(task.riskLevel)}`}>{t.level} {task.riskLevel}</span><span className={`state ${statusTone(task.status)}`}>{statusText(task.status, t)}</span></div><h3>{task.title}</h3><p>{task.description}</p><footer><span>{t.expected}: <b>{task.expectedOutcome}</b></span><span>◷ {task.estimatedMinutes} min</span></footer></div></article>; }
function Approvals({ t, approvals, tasks, onSelect }: { t: typeof copy.zh; approvals: Approval[]; tasks: AtlasV2Data["tasks"]; onSelect: (item: Approval) => void }) { const pending = approvals.filter((item) => item.status === "pending"); return <><section className="view-title"><p>APPROVAL CONTROL</p><h1>{t.approvals}</h1><span>{t.approvalQueue}</span></section><div className="approval-grid">{pending.length ? pending.map((item) => <article key={item.id} className="approval-card"><div><span className={`risk ${riskTone(item.riskLevel)}`}>{t.level} {item.riskLevel}</span><small>{item.actionType} · {item.createdAt}</small></div><h2>{item.title}</h2><p>{item.reason}</p><pre>{item.payload}</pre><footer><button className="approve" onClick={() => onSelect(item)}>{t.viewReason} →</button><span>{tasks.find((task) => task.id === item.taskId)?.estimatedMinutes} min</span></footer></article>) : <div className="empty-v2">{t.noApprovals}</div>}</div></> }
function Activity({ t, data }: { t: typeof copy.zh; data: AtlasV2Data }) { return <><section className="view-title"><p>AGENT RUNTIME</p><h1>{t.activity}</h1><span>{t.activityLead}</span></section><div className="run-list">{data.runs.map((run) => <article key={run.id}><span className={`run-dot ${statusTone(run.status)}`} /><div><div className="run-meta"><span>{run.startedAt}</span><span>{data.agents.find((agent) => agent.id === run.agentId)?.name}</span><span className={`state ${statusTone(run.status)}`}>{statusText(run.status, t)}</span></div><h2>{run.task}</h2><p>{run.output}</p><footer><span>{t.source}: {run.input}</span><span>{t.tools}: {run.tools.join(" · ")}</span><b>{run.result}</b></footer></div></article>)}</div></> }
function Opportunities({ t, items, onMutate, onCreateCampaign }: { t: typeof copy.zh; items: Opportunity[]; onMutate: (action: string, id: number, message: string) => void; onCreateCampaign: (item: Opportunity) => void }) { return <><section className="view-title"><p>OPPORTUNITY SCAN</p><h1>{t.opportunities}</h1><span>{t.opportunityLead}</span></section><div className="opportunity-grid">{items.map((item) => <article key={item.id}><header><span>{item.signal}</span><b>{item.confidence}% {t.confidence}</b></header><h2>{item.title}</h2><p>{item.summary}</p><footer><small>{item.source} · {item.observedAt}</small><strong>{t.action}: {item.suggestedAction}</strong><div><button className="campaign-create" onClick={() => onCreateCampaign(item)}>{t.campaigns} →</button>{item.status === "new" && <><button onClick={() => onMutate("save_opportunity", item.id, t.opportunitySaved)}>{t.save}</button><button onClick={() => onMutate("ignore_opportunity", item.id, t.opportunityIgnored)}>{t.ignore}</button></>}{item.status !== "new" && <span className="state saved">{statusText(item.status, t)}</span>}</div></footer></article>)}</div></> }

function CampaignComposer({ locale, opportunity, busy, onClose, onCreate }: { locale: Locale; opportunity: Opportunity; busy: boolean; onClose: () => void; onCreate: (objective: string, channels: string[]) => void }) {
  const zh = locale === "zh";
  const [objective, setObjective] = useState(zh ? "获取更多目标用户访问和注册" : "Drive qualified visits and signups");
  const [channels, setChannels] = useState<string[]>(["x", "linkedin", "blog"]);
  const toggle = (channel: string) => setChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]);
  return <div className="drawer-backdrop campaign-backdrop" onMouseDown={busy ? undefined : onClose}><aside className="campaign-composer" onMouseDown={(event) => event.stopPropagation()}><button className="drawer-close" disabled={busy} onClick={onClose}>×</button><p>GROWTH CAMPAIGN AGENT</p><h2>{zh ? "把机会变成可执行 Campaign" : "Turn this opportunity into a campaign"}</h2><article><span>{opportunity.signal} · {opportunity.confidence}%</span><strong>{opportunity.title}</strong><small>{opportunity.suggestedAction}</small></article><label>{zh ? "Campaign 目标" : "Campaign objective"}<textarea value={objective} disabled={busy} onChange={(event) => setObjective(event.target.value)} /></label><fieldset className="channel-picker"><legend>{zh ? "生成渠道内容" : "Generate channel assets"}</legend>{channelOptions.map(([id, item]) => <label key={id} title={item.format}><input type="checkbox" checked={channels.includes(id)} disabled={busy} onChange={() => toggle(id)} /><span>{zh ? item.labelZh : item.label}</span><small>{item.mode === "api" ? (zh ? "可接 API" : "API-ready") : item.mode === "manual" ? (zh ? "人工发布" : "Manual") : (zh ? "审核发布" : "Review")}</small></label>)}</fieldset><button className="campaign-generate" disabled={busy || !objective.trim() || !channels.length || channels.length > 5} onClick={() => onCreate(objective, channels)}>{busy ? (zh ? "Campaign Agent 正在生成…" : "Campaign Agent is generating…") : (zh ? "生成 Campaign 与内容" : "Generate campaign and content")}</button><small>{channels.length > 5 ? (zh ? "一次最多选择 5 个渠道，便于生成更准确的内容。" : "Choose up to five channels per generation for better drafts.") : (zh ? "社区互动内容需要人工审核；Atlas 不会批量 @ 用户或发布重复回复。" : "Community interactions require review. Atlas never mass-mentions users or posts repetitive replies.")}</small></aside></div>;
}

function Campaigns({ locale, data, onAssetAction, onOpenApprovals }: { locale: Locale; data: AtlasV2Data; onAssetAction: (action: string, asset: CampaignAsset, payload?: Record<string, unknown>) => Promise<void>; onOpenApprovals: () => void }) {
  const zh = locale === "zh";
  const campaigns = data.campaigns ?? [];
  const assets = data.campaignAssets ?? [];
  return <><section className="view-title campaign-view-title"><p>GROWTH CAMPAIGNS · CONTENT STUDIO</p><h1>{zh ? "内容工作室" : "Content Studio"}</h1><span>{zh ? "按渠道预览、编辑和审批内容；批准后进入待发布区，再记录真实增长效果。" : "Preview, edit, and approve channel-ready content. Approved assets move to Publish ready before results are recorded."}</span></section>{assets.length > 0 && <GrowthPerformance locale={locale} assets={assets} productMetrics={data.metrics} />}{campaigns.length === 0 ? <div className="empty-v2 campaign-empty"><strong>{zh ? "还没有 Campaign" : "No campaigns yet"}</strong><span>{zh ? "前往增长机会，选择一个机会创建 Campaign。" : "Open Opportunities and turn one into a campaign."}</span></div> : <div className="campaign-list">{campaigns.map((campaign) => <section key={campaign.id} className="campaign-card"><header><div><span>{campaign.status}</span><h2>{campaign.name}</h2><p>{campaign.objective}</p></div><dl><div><dt>{zh ? "受众" : "Audience"}</dt><dd>{campaign.audience}</dd></div><div><dt>{zh ? "核心信息" : "Core message"}</dt><dd>{campaign.coreMessage}</dd></div><div><dt>CTA</dt><dd>{campaign.cta}</dd></div></dl></header><div className="campaign-assets">{assets.filter((asset) => asset.campaignId === campaign.id).map((asset) => <ContentStudioAsset key={`${asset.id}:${asset.status}:${asset.title}:${asset.content}`} locale={locale} productName={data.product?.name ?? "Atlas"} productUrl={data.product?.url ?? ""} asset={asset} providerReady={asset.channel === "blog" ? Boolean(data.publishing?.wordpress) : asset.channel === "x" ? Boolean(data.publishing?.x) : asset.channel === "linkedin" ? Boolean(data.publishing?.linkedin) : asset.channel === "reddit" ? Boolean(data.publishing?.reddit) : false} onAssetAction={onAssetAction} onOpenApprovals={onOpenApprovals} />)}</div></section>)}</div>}</>;
}

function GrowthPerformance({ locale, assets, productMetrics }: { locale: Locale; assets: CampaignAsset[]; productMetrics: AtlasV2Data["metrics"] }) {
  const zh = locale === "zh";
  const totals = assets.reduce((sum, item) => ({ impressions: sum.impressions + item.impressions, clicks: sum.clicks + item.clicks, conversions: sum.conversions + item.conversions }), { impressions: 0, clicks: 0, conversions: 0 });
  const ctr = totals.impressions ? (totals.clicks / totals.impressions * 100).toFixed(1) : "0.0";
  return <section className="growth-performance"><header><div><p>DAILY GROWTH SIGNALS</p><h2>{zh ? "增长效果总览" : "Growth performance"}</h2></div><span>{zh ? "当前：人工回填 · 连接平台后每日自动同步" : "Manual entry · Daily sync after connecting platforms"}</span></header><div><article><small>{zh ? "内容曝光" : "Content impressions"}</small><strong>{totals.impressions.toLocaleString()}</strong></article><article><small>{zh ? "内容点击" : "Content clicks"}</small><strong>{totals.clicks.toLocaleString()}</strong><b>CTR {ctr}%</b></article><article><small>{zh ? "归因转化" : "Attributed conversions"}</small><strong>{totals.conversions.toLocaleString()}</strong></article><article><small>{zh ? "产品访问 / 注册" : "Product visits / signups"}</small><strong>{productMetrics.visits.toLocaleString()} / {productMetrics.signups}</strong><b>{zh ? "需连接分析工具自动归因" : "Connect analytics for attribution"}</b></article></div></section>;
}

function ContentStudioAsset({ locale, productName, productUrl, asset, providerReady, onAssetAction, onOpenApprovals }: { locale: Locale; productName: string; productUrl: string; asset: CampaignAsset; providerReady: boolean; onAssetAction: (action: string, asset: CampaignAsset, payload?: Record<string, unknown>) => Promise<void>; onOpenApprovals: () => void }) {
  const zh = locale === "zh";
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [draft, setDraft] = useState({ title: asset.title, content: asset.content, cta: asset.cta });
  const [busy, setBusy] = useState<"save" | "regenerate" | "publish" | "">("");
  const [scheduledFor, setScheduledFor] = useState("");
  const limit = campaignChannelLimit(asset.channel);
  const label = zh ? campaignChannels[asset.channel].labelZh : campaignChannels[asset.channel].label;
  const trackingUrl = campaignTrackingUrl(productUrl, asset.channel, asset.campaignId, asset.id);
  const changed = draft.title !== asset.title || draft.content !== asset.content || draft.cta !== asset.cta;
  const run = async (kind: typeof busy, action: string, payload: Record<string, unknown> = {}) => { setBusy(kind); try { await onAssetAction(action, asset, payload); if (kind === "save") setMode("preview"); } finally { setBusy(""); } };
  const copyAsset = async () => navigator.clipboard.writeText(`${draft.title}\n\n${draft.content}\n\n${draft.cta}\n${trackingUrl}`);
  const exportBlog = () => { const body = `# ${draft.title}\n\n${draft.content}\n\n**CTA:** [${draft.cta}](${trackingUrl})\n`; const url = URL.createObjectURL(new Blob([body], { type: "text/markdown;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `${draft.title.replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-").replace(/^-|-$/g, "") || "atlas-blog"}.md`; link.click(); URL.revokeObjectURL(url); };
  return <article className={`content-studio-asset channel-${asset.channel}`}>
    <div className="campaign-asset-head"><span>{label}</span><b className={`state ${statusTone(asset.status)}`}>{asset.status === "pending_approval" ? (zh ? "待审批" : "Pending approval") : asset.status === "approved" ? (zh ? "待发布" : "Publish ready") : asset.status === "published" ? (zh ? "已发布" : "Published") : asset.status}</b></div>
    <div className="studio-tabs"><button className={mode === "preview" ? "on" : ""} onClick={() => setMode("preview")}>{zh ? "平台预览" : "Platform preview"}</button><button className={mode === "edit" ? "on" : ""} onClick={() => setMode("edit")}>{zh ? "编辑" : "Edit"}</button></div>
    {mode === "edit" ? <div className="studio-editor"><label>{zh ? "标题" : "Title"}<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label>{zh ? "正文" : "Content"}<textarea value={draft.content} maxLength={limit} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label><div className={`studio-count ${draft.content.length > limit * .95 ? "near" : ""}`}>{draft.content.length.toLocaleString()} / {limit.toLocaleString()}</div><label>CTA<input value={draft.cta} onChange={(event) => setDraft({ ...draft, cta: event.target.value })} /></label>{changed && asset.status === "approved" && <p className="approval-reset-note">{zh ? "保存修改后需要重新审批。" : "Saving edits will require approval again."}</p>}<button className="studio-save" disabled={!changed || !draft.title.trim() || !draft.content.trim() || !draft.cta.trim() || Boolean(busy)} onClick={() => void run("save", "update_campaign_asset", draft)}>{busy === "save" ? (zh ? "保存中…" : "Saving…") : (zh ? "保存并送审" : "Save & request approval")}</button></div> : <PlatformPreview channel={asset.channel} productName={productName} title={draft.title} content={draft.content} cta={trackingUrl} />}
    <div className="tracking-link"><span>{zh ? "Atlas 追踪链接" : "Atlas tracking link"}</span><code>{trackingUrl}</code><button onClick={() => void navigator.clipboard.writeText(trackingUrl)}>{zh ? "复制" : "Copy"}</button></div>
    {asset.status === "approved" && <div className="publish-ready"><span>✓</span><div><strong>{zh ? "内容已批准，可以发布" : "Approved and publish ready"}</strong><small>{providerReady ? (zh ? "该渠道已配置，可立即发布或安排在未来时间发布；Atlas 会保存回执。" : "This provider is configured. Publish now or schedule a future time; Atlas saves the receipt.") : (zh ? "该渠道尚未配置；仍可复制内容并回填发布链接。" : "This provider is not configured yet. You can still copy the content and record the live URL.")}</small>{providerReady && <input aria-label={zh ? "计划发布时间" : "Scheduled publish time"} type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />}</div>{providerReady && <button disabled={Boolean(busy)} onClick={() => void run("publish", "publish_campaign_asset", scheduledFor ? { scheduledFor: new Date(scheduledFor).toISOString() } : {})}>{busy === "publish" ? (zh ? "发布中…" : "Publishing…") : scheduledFor ? (zh ? "安排发布" : "Schedule publish") : (zh ? "Atlas 自动发布" : "Publish with Atlas")}</button>}</div>}
    <div className="campaign-asset-actions"><button disabled={Boolean(busy)} onClick={() => void copyAsset()}>{zh ? "复制完整内容" : "Copy full post"}</button>{asset.channel === "blog" && <button onClick={exportBlog}>{zh ? "导出 Markdown" : "Export Markdown"}</button>}<button disabled={Boolean(busy)} onClick={() => void run("regenerate", "regenerate_campaign_asset", { locale })}>{busy === "regenerate" ? (zh ? "重生成中…" : "Regenerating…") : (zh ? "重生成此渠道" : "Regenerate channel")}</button>{asset.status === "pending_approval" && <button className="review" onClick={onOpenApprovals}>{zh ? "前往审批" : "Review approval"}</button>}</div>
    {asset.status === "approved" && <ManualPublishPanel locale={locale} busy={busy === "publish"} onPublish={(publishedUrl) => run("publish", "mark_campaign_asset_published", { publishedUrl })} />}
    {asset.status === "published" && asset.publishedUrl && <a className="published-receipt" href={asset.publishedUrl} target="_blank" rel="noreferrer"><span>{zh ? "已记录发布链接" : "Published URL recorded"}</span><strong>{asset.publishedUrl} ↗</strong></a>}
    {asset.status === "published" && <CampaignMetrics locale={locale} asset={asset} onSave={(metrics) => onAssetAction("update_campaign_metrics", asset, { metrics })} />}
  </article>;
}

function ManualPublishPanel({ locale, busy, onPublish }: { locale: Locale; busy: boolean; onPublish: (url: string) => Promise<void> }) {
  const zh = locale === "zh";
  const [url, setUrl] = useState("");
  const valid = (() => { try { return new URL(url).protocol === "https:"; } catch { return false; } })();
  return <div className="manual-publish"><div><strong>{zh ? "手动发布回填" : "Manual publishing receipt"}</strong><small>{zh ? "发布后粘贴帖子链接，Atlas 才能确认发布并关联效果数据。" : "Paste the live post URL so Atlas can confirm publishing and attach performance data."}</small></div><input type="url" placeholder="https://…" value={url} onChange={(event) => setUrl(event.target.value)} /><button disabled={!valid || busy} onClick={() => void onPublish(url)}>{busy ? (zh ? "记录中…" : "Saving…") : (zh ? "确认已发布" : "Confirm published")}</button></div>;
}

function PlatformPreview({ channel, productName, title, content, cta }: { channel: string; productName: string; title: string; content: string; cta: string }) {
  if (channel === "blog") return <div className="platform-preview blog-preview"><div className="browser-bar"><i /><i /><i /><span>blog.preview</span></div><div className="blog-body"><small>GROWTH NOTES · 6 MIN READ</small><h3>{title}</h3><p>{content}</p><button>{cta}</button></div></div>;
  const linkedIn = channel === "linkedin";
  if (channel === "x" || linkedIn) return <div className={`platform-preview ${linkedIn ? "linkedin-preview" : "x-preview"}`}><header><span className="preview-avatar">{productName.slice(0, 1).toUpperCase()}</span><div><strong>{productName}</strong><small>{linkedIn ? `${productName} · 1h` : `@${productName.toLowerCase().replace(/\W+/g, "")} · 1h`}</small></div><b>•••</b></header><p>{content}</p>{cta && <a>{cta}</a>}<footer>{linkedIn ? <><span>Like</span><span>Comment</span><span>Repost</span><span>Send</span></> : <><span>♡ 24</span><span>◯ 8</span><span>↗ 3</span><span>⌁</span></>}</footer></div>;
  const spec = isCampaignPreviewChannel(channel) ? campaignChannels[channel] : null;
  return <div className={`platform-preview community-preview channel-preview-${channel}`}><div className="community-brand"><span>{spec?.label ?? channel}</span><b>{spec?.mode === "api" ? "API READY" : spec?.mode === "manual" ? "MANUAL" : "REVIEW"}</b></div><header><span className="preview-avatar">{productName.slice(0, 1).toUpperCase()}</span><div><strong>{productName}</strong><small>{spec?.label ?? channel} · draft preview</small></div><b>•••</b></header><div className="community-content"><h3>{title}</h3><p>{content}</p></div>{cta && <a>{cta}</a>}<footer><span>△ Helpful</span><span>◯ Reply</span><span>↗ Share</span></footer></div>;
}

function isCampaignPreviewChannel(value: string): value is CampaignChannel { return value in campaignChannels; }

function CampaignMetrics({ locale, asset, onSave }: { locale: Locale; asset: CampaignAsset; onSave: (metrics: { impressions: number; clicks: number; conversions: number }) => void }) {
  const zh = locale === "zh";
  const [metrics, setMetrics] = useState({ impressions: asset.impressions, clicks: asset.clicks, conversions: asset.conversions });
  return <div className="campaign-metrics"><label>{zh ? "曝光" : "Impressions"}<input type="number" min="0" value={metrics.impressions} onChange={(event) => setMetrics({ ...metrics, impressions: Number(event.target.value) })} /></label><label>{zh ? "点击" : "Clicks"}<input type="number" min="0" value={metrics.clicks} onChange={(event) => setMetrics({ ...metrics, clicks: Number(event.target.value) })} /></label><label>{zh ? "转化" : "Conversions"}<input type="number" min="0" value={metrics.conversions} onChange={(event) => setMetrics({ ...metrics, conversions: Number(event.target.value) })} /></label><button onClick={() => onSave(metrics)}>{zh ? "保存效果" : "Save results"}</button></div>;
}

function CompanyProfile({ locale, data, onMutate }: { locale: Locale; data: AtlasV2Data; onMutate: (action: string, id: number, message: string, extra?: Record<string, unknown>) => Promise<void> }) {
  const zh = locale === "zh";
  const facts = data.companyBrain?.facts ?? [];
  const [editing, setEditing] = useState("");
  const [draft, setDraft] = useState("");
  const [custom, setCustom] = useState({ factType: "founder_preference", subject: "", value: "" });
  const profileGroups = [
    { key: "company", title: zh ? "公司基础" : "Company foundation", types: ["product", "company", "stage", "goal"] },
    { key: "market", title: zh ? "客户与市场" : "Customer & market", types: ["icp", "customer", "pain", "positioning", "channel"] },
    { key: "founder", title: zh ? "Founder 工作偏好" : "Founder preferences", types: ["founder_preference", "risk", "tone", "approval"] },
  ];
  const save = async (factType: string, subject: string, value: string) => {
    await onMutate("update_company_fact", 0, zh ? "公司画像已更新，下一次决策会使用这条信息。" : "Company profile updated. Atlas will use it in the next decision.", { factType, subject, value });
    setEditing(""); setCustom({ factType: "founder_preference", subject: "", value: "" });
  };
  return <><section className="view-title profile-title"><p>COMPANY PROFILE · SHARED CONTEXT</p><h1>{zh ? "Atlas 眼中的公司" : "How Atlas understands the company"}</h1><span>{zh ? "这里不是静态设置页。每一条事实、偏好和纠正都会进入 Atlas 后续的决策上下文。" : "This is not a static settings page. Every fact, preference, and correction enters Atlas's future decision context."}</span></section>
    <section className="profile-confidence"><div><strong>{facts.length}</strong><span>{zh ? "条活跃公司事实" : "active company facts"}</span></div><div><strong>{facts.filter((item) => item.confidence >= 90).length}</strong><span>{zh ? "条高置信信息" : "high-confidence facts"}</span></div><div><strong>{data.behaviorRules?.filter((item) => item.status === "active").length ?? 0}</strong><span>{zh ? "条 Founder 行为规则" : "Founder behavior rules"}</span></div><p>{zh ? "你在这里的直接修改拥有最高优先级，并保留来源与更新时间。" : "Direct Founder corrections have highest priority and preserve their source and timestamp."}</p></section>
    <div className="profile-groups">{profileGroups.map((group) => { const items = facts.filter((item) => group.types.includes(item.factType)); return <section key={group.key}><header><span>{group.title}</span><b>{items.length}</b></header><div>{items.length ? items.map((item) => { const key = `${item.factType}:${item.subject}`; const value = typeof item.value === "string" ? item.value : JSON.stringify(item.value); return <article key={key}><div><small>{item.factType} · {item.subject}</small><b>{item.confidence}%</b></div>{editing === key ? <><textarea value={draft} onChange={(event) => setDraft(event.target.value)} /><footer><button onClick={() => void save(item.factType, item.subject, draft)}>{zh ? "保存纠正" : "Save correction"}</button><button onClick={() => setEditing("")}>{zh ? "取消" : "Cancel"}</button></footer></> : <><p>{value}</p><footer><span>{item.source} · {new Date(item.lastVerifiedAt).toLocaleDateString(zh ? "zh-CN" : "en-US")}</span><button onClick={() => { setEditing(key); setDraft(value); }}>{zh ? "纠正" : "Correct"}</button></footer></>}</article>; }) : <div className="profile-empty">{zh ? "Atlas 尚未形成这部分理解，你可以直接补充。" : "Atlas has not formed this part of its understanding yet."}</div>}</div></section>; })}</div>
    <section className="profile-add"><div><span>ADD FOUNDER CONTEXT</span><h2>{zh ? "告诉 Atlas 一条长期有效的信息" : "Teach Atlas something that should persist"}</h2></div><select value={custom.factType} onChange={(event) => setCustom({ ...custom, factType: event.target.value })}><option value="founder_preference">{zh ? "Founder 偏好" : "Founder preference"}</option><option value="icp">ICP</option><option value="positioning">{zh ? "产品定位" : "Positioning"}</option><option value="channel">{zh ? "渠道经验" : "Channel knowledge"}</option><option value="risk">{zh ? "风险约束" : "Risk constraint"}</option><option value="tone">{zh ? "沟通语气" : "Communication tone"}</option><option value="approval">{zh ? "审批偏好" : "Approval preference"}</option></select><input placeholder={zh ? "主题，例如：公开内容语气" : "Subject, e.g. public content tone"} value={custom.subject} onChange={(event) => setCustom({ ...custom, subject: event.target.value })} /><textarea placeholder={zh ? "例如：公开表达保持克制、专业，不使用夸张的营销语言。" : "For example: Keep public communication calm and professional; avoid exaggerated marketing language."} value={custom.value} onChange={(event) => setCustom({ ...custom, value: event.target.value })} /><button disabled={!custom.subject.trim() || !custom.value.trim()} onClick={() => void save(custom.factType, custom.subject, custom.value)}>{zh ? "保存到 Company Brain" : "Save to Company Brain"}</button></section>
  </>;
}

function CompanyRoutines({ locale, data, onMutate }: { locale: Locale; data: AtlasV2Data; onMutate: (action: string, id: number, message: string, extra?: Record<string, unknown>) => Promise<void> }) {
  const zh = locale === "zh";
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(0);
  const routines = data.routines?.items ?? [];
  const recentRuns = data.routines?.runs ?? [];
  const cadence = (minutes: number, triggerType: string, eventType: string | null) => triggerType === "event" ? `${zh ? "事件触发" : "Event"} · ${eventType ?? "signal"}` : minutes <= 60 ? (zh ? "每小时" : "Hourly") : minutes <= 1440 ? (zh ? "每天" : "Daily") : minutes <= 10080 ? (zh ? "每周" : "Weekly") : (zh ? "每月" : "Monthly");
  const act = async (action: string, id: number, message: string, extra: Record<string, unknown> = {}) => { setBusy(id || -1); try { await onMutate(action, id, message, extra); } finally { setBusy(0); } };
  return <><section className="view-title routines-title"><p>COMPANY ROUTINES · CONTINUOUS WORK</p><h1>{zh ? "让 Atlas 持续完成重复经营工作" : "Let Atlas continuously handle recurring company work"}</h1><span>{zh ? "Routine 是触发器，不会绕过经营闭环：它收集证据、进入决策、按信任等级准备或执行，再衡量并学习。" : "A Routine is a trigger, not a shortcut. It gathers evidence, enters the decision loop, follows trust policy, then measures and learns."}</span></section>
    <section className="routine-composer"><div><span>NATURAL LANGUAGE ROUTINE</span><h2>{zh ? "像交代员工一样描述工作" : "Describe the work like you would to an employee"}</h2><p>{zh ? "Atlas 会识别触发方式、频率、对应 Playbook 与默认信任等级。" : "Atlas infers the trigger, cadence, playbook, and default trust level."}</p></div><textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder={zh ? "例如：每周一检查 GSC 中排名 8–20 的关键词，并提出三个可衡量的内容实验。" : "Example: Every Monday, check GSC queries ranking 8–20 and propose three measurable content experiments."} /><button disabled={!instruction.trim() || busy === -1} onClick={() => void act("create_routine", 0, zh ? "Routine 已创建并进入运行计划。" : "Routine created and scheduled.", { instruction }).then(() => setInstruction(""))}>{busy === -1 ? "…" : zh ? "创建 Routine" : "Create routine"}</button></section>
    <div className="routine-grid">{routines.map((item) => <article key={item.id} className={item.status !== "active" ? "paused" : ""}><header><div><span>{item.playbookKey}</span><b className={`state ${item.status}`}>{item.status}</b></div><h2>{item.name}</h2><p>{item.instruction}</p></header><dl><div><dt>{zh ? "触发" : "Trigger"}</dt><dd>{cadence(item.cadenceMinutes, item.triggerType, item.eventType)}</dd></div><div><dt>{zh ? "信任" : "Trust"}</dt><dd>{item.trustLevel}</dd></div><div><dt>{zh ? "下次运行" : "Next run"}</dt><dd>{item.nextRunAt ? new Date(item.nextRunAt).toLocaleString(zh ? "zh-CN" : "en-US") : (zh ? "等待事件" : "Awaiting event")}</dd></div></dl><footer><span>{item.lastSummary || (zh ? "尚未运行" : "Not run yet")}</span><div><button disabled={busy === item.id} onClick={() => void act("run_routine", item.id, zh ? "Routine 已完成一次人工运行。" : "Routine completed a manual run.")}>{zh ? "立即运行" : "Run now"}</button><button disabled={busy === item.id} onClick={() => void act("toggle_routine", item.id, item.status === "active" ? (zh ? "Routine 已暂停。" : "Routine paused.") : (zh ? "Routine 已恢复。" : "Routine resumed."))}>{item.status === "active" ? (zh ? "暂停" : "Pause") : (zh ? "恢复" : "Resume")}</button></div></footer></article>)}</div>
    {recentRuns.length > 0 && <section className="routine-history"><header><span>RECENT ROUTINE RUNS</span><b>{recentRuns.length}</b></header>{recentRuns.slice(0, 8).map((run) => <div key={run.id}><span className={`run-dot ${run.status}`} /><strong>{routines.find((item) => item.id === run.routineId)?.name ?? `Routine #${run.routineId}`}</strong><p>{run.summary}</p><small>{new Date(run.startedAt).toLocaleString(zh ? "zh-CN" : "en-US")}</small></div>)}</section>}
  </>;
}

function TrustAndLearning({ locale, data, onMutate }: { locale: Locale; data: AtlasV2Data; onMutate: (action: string, id: number, message: string, extra?: Record<string, unknown>) => Promise<void> }) {
  const zh = locale === "zh";
  const levels = [
    { id: "observe", zh: "只观察", en: "Observe", note: zh ? "只能读取与分析" : "Read and analyze only" },
    { id: "recommend", zh: "提出建议", en: "Recommend", note: zh ? "给出建议，不准备动作" : "Recommend without preparing work" },
    { id: "prepare", zh: "准备草稿", en: "Prepare", note: zh ? "可准备内部草稿与计划" : "Prepare internal drafts and plans" },
    { id: "approval", zh: "批准后执行", en: "Approval", note: zh ? "Founder 批准后执行" : "Execute after Founder approval" },
    { id: "autopilot", zh: "自动执行", en: "Autopilot", note: zh ? "在风险上限内自动执行" : "Execute within the risk ceiling" },
  ];
  return <><section className="view-title trust-title"><p>PROGRESSIVE TRUST · CORRECTION LEARNING</p><h1>{zh ? "信任不是一个总开关" : "Trust is not one global switch"}</h1><span>{zh ? "你可以针对每种动作独立授权。每次接受、拒绝和修改也会成为可查看、可撤销的公司规则。" : "Authorize each action type independently. Every acceptance, rejection, and edit can become a visible, reversible company rule."}</span></section>
    <section className="trust-ladder">{levels.map((level, index) => <article key={level.id}><b>0{index + 1}</b><strong>{zh ? level.zh : level.en}</strong><span>{level.note}</span></article>)}</section>
    <div className="trust-policy-grid">{(data.trust?.policies ?? []).map((policy) => <article key={policy.actionType}><header><span>{policy.actionType.replaceAll("_", " ")}</span><b>RISK ≤ {policy.maxRiskLevel}</b></header><p>{policy.reason}</p><label>{zh ? "当前信任等级" : "Current trust level"}<select value={policy.trustLevel} onChange={(event) => void onMutate("update_trust_policy", 0, zh ? "动作信任等级已更新。" : "Action trust updated.", { actionType: policy.actionType, trustLevel: event.target.value, maxRiskLevel: policy.maxRiskLevel })}>{levels.map((level) => <option value={level.id} key={level.id}>{zh ? level.zh : level.en}</option>)}</select></label></article>)}</div>
    <section className="behavior-rules"><header><div><span>LEARNED COMPANY RULES</span><h2>{zh ? "Atlas 从你的纠正中学到什么" : "What Atlas learned from your corrections"}</h2></div><b>{data.behaviorRules?.filter((item) => item.status === "active").length ?? 0}</b></header>{data.behaviorRules?.length ? data.behaviorRules.map((rule) => <article key={rule.id} className={rule.status !== "active" ? "inactive" : ""}><span>{rule.category}</span><p>{rule.ruleText}</p><b>{rule.confidence}%</b>{rule.status === "active" && <button onClick={() => void onMutate("dismiss_behavior_rule", rule.id, zh ? "这条行为规则已停用。" : "Behavior rule disabled.")}>{zh ? "停用" : "Disable"}</button>}</article>) : <div className="empty-v2">{zh ? "还没有行为规则。拒绝建议时填写原因并保存为规则，Atlas 就会开始学习。" : "No behavior rules yet. Reject an action with a reason and save it as a rule to teach Atlas."}</div>}</section>
    {(data.founderFeedback?.length ?? 0) > 0 && <section className="feedback-ledger"><header><span>FOUNDER FEEDBACK LEDGER</span><b>{data.founderFeedback?.length}</b></header>{data.founderFeedback?.slice(0, 8).map((item) => <div key={item.id}><strong>{item.feedbackType}</strong><span>{item.targetType}</span><p>{item.reason || (zh ? "未填写原因" : "No reason supplied")}</p><small>{new Date(item.createdAt).toLocaleString(zh ? "zh-CN" : "en-US")}</small></div>)}</section>}
  </>;
}

function Memory({ t, data }: { t: typeof copy.zh; data: AtlasV2Data }) {
  const brain = data.companyBrain;
  const zh = t === copy.zh;
  const decision = brain?.decisions[0];
  const breakdown = decision?.context.breakdown;
  const factors = breakdown ? [
    [zh ? "证据" : "Evidence", breakdown.evidence],
    [zh ? "目标贡献" : "Goal fit", breakdown.goalAlignment],
    [zh ? "运营知识" : "Knowledge", breakdown.knowledgeFit],
    [zh ? "历史效果" : "History", breakdown.historicalPerformance],
    [zh ? "成本效率" : "Cost", breakdown.costEfficiency],
    [zh ? "风险适配" : "Risk", breakdown.riskFit],
    [zh ? "渠道容量" : "Capacity", breakdown.channelCapacity],
  ] : [];
  return <>
    <section className="view-title"><p>COMPANY BRAIN</p><h1>{t.memory}</h1><span>{t.memoryLead}</span></section>
    {brain && <section className="runtime-status"><div><span>{t.company}</span><strong>{brain.facts.length} {t.evidence}</strong><small>{data.product ? (zh ? "已验证的公司事实会进入 Atlas 的下一次判断。" : "Verified company facts are used in Atlas's next decision.") : (zh ? "完成产品分析后，Atlas 会建立公司的事实层。" : "Finish product analysis to establish the company fact layer.")}</small></div><div><span>OPERATING KNOWLEDGE</span><strong>{brain.knowledgePacks.length}</strong><small>{brain.knowledgePacks.map((item) => item.name).join(" · ") || (zh ? "暂无匹配知识包" : "No matched knowledge pack yet")}</small></div><div><span>LEARNING LOOP</span><strong>{brain.experiments.length} {t.action}</strong><small>{decision?.title || (zh ? "等待 Atlas 的第一条可追溯决策。" : "Waiting for Atlas's first traceable decision.")}</small></div></section>}
    {decision && <section className="decision-intelligence"><header><div><span>DECISION INTELLIGENCE</span><h2>{decision.title}</h2></div><strong>{decision.score}<small>/100</small></strong></header><p>{decision.rationale}</p><div className="decision-factors">{factors.map(([label, value]) => <span key={String(label)}><b>{value}</b>{label}</span>)}</div><footer><span>{decision.context.strategyKey || "growth"} · {decision.context.channel || "growth"} · {zh ? `风险等级 ${decision.context.riskLevel ?? 1}` : `Risk level ${decision.context.riskLevel ?? 1}`}</span><span>{decision.alternatives.length ? (zh ? `已比较并暂缓 ${decision.alternatives.length} 个方案` : `${decision.alternatives.length} alternatives compared and deferred`) : (zh ? "当前没有其他合格方案" : "No other qualified alternative")}</span></footer>{decision.alternatives.length > 0 && <details><summary>{zh ? "查看未选择方案" : "Review deferred alternatives"}</summary>{decision.alternatives.map((item) => <div key={item.opportunityId}><b>{item.score}/100 · {item.title}</b><span>{item.reason}</span></div>)}</details>}</section>}
    {brain && <section className="learning-loop-panel"><header><div><span>EXPERIMENT & LEARNING LOOP</span><h2>{zh ? "Atlas 如何从结果中改变下一次决策" : "How results change Atlas's next decision"}</h2></div><b>{brain.experiments.filter((item) => item.status === "completed").length}/{brain.experiments.length}</b></header><div>{brain.experiments.slice(0, 6).map((item) => <article key={item.id}><span className={`state ${item.outcome === "success" ? "completed" : item.outcome === "failed" ? "failed" : item.status}`}>{item.outcome ?? item.status}</span><h3>{item.name}</h3><p>{item.resultSummary ?? item.hypothesis}</p><footer><span>{item.primaryMetric}: {item.baselineValue ?? "—"} → {item.metricValue ?? "—"}</span><b>{item.evaluationEndsAt ? new Date(item.evaluationEndsAt).toLocaleDateString(zh ? "zh-CN" : "en-US") : "—"}</b></footer></article>)}</div>{brain.strategyPerformance.length > 0 && <aside>{brain.strategyPerformance.map((item) => <div key={item.strategyKey}><strong>{item.strategyKey}</strong><span>{zh ? "策略权重" : "Weight"} {item.weight.toFixed(2)}</span><span>{item.successCount}W / {item.failureCount}L</span><b>{item.suppressedUntil ? (zh ? `暂停至 ${new Date(item.suppressedUntil).toLocaleDateString("zh-CN")}` : `Suppressed until ${new Date(item.suppressedUntil).toLocaleDateString("en-US")}`) : (zh ? "可继续使用" : "Eligible")}</b></div>)}</aside>}</section>}
    <div className="memory-grid">{data.memories.map((item) => <article key={item.id}><header><span>{item.type}</span><span className={`state ${statusTone(item.status)}`}>{statusText(item.status, t)}</span></header><h2>{item.title}</h2><p>{item.content}</p><footer><span>{t.source}: {item.source}</span><b>{item.confidence}% · {item.verifiedAt}</b></footer></article>)}</div>
  </>;
}
function Agents({ t, data }: { t: typeof copy.zh; data: AtlasV2Data }) { return <><section className="view-title"><p>AGENT RUNTIME</p><h1>{t.agents}</h1><span>{t.agentLead}</span></section><div className="agent-grid">{data.agents.map((agent) => <article key={agent.id}><div className="agent-avatar">{agent.name.slice(0, 1)}</div><div className="agent-heading"><span className={`live ${agent.status === "running" ? "" : "idle"}`} /><small>{statusText(agent.status, t)}</small></div><h2>{agent.name}</h2><p>{agent.role}</p><span className="agent-description">{agent.description}</span><dl><div><dt>{t.auto}</dt><dd>{t.level} {agent.autonomyLevel}</dd></div><div><dt>{t.schedule}</dt><dd>{agent.schedule}</dd></div><div><dt>{t.tools}</dt><dd>{agent.tools.join(" · ")}</dd></div></dl><footer><span>{agent.currentTask}</span><b>{agent.successRate}% {t.success}</b></footer></article>)}</div></> }
function Connections({ t, data, onReflect }: { t: typeof copy.zh; data: AtlasV2Data; onReflect: () => Promise<void> }) {
  const zh = t.workspace === copy.zh.workspace;
  const [wordpress, setWordpress] = useState({ siteUrl: "", username: "", applicationPassword: "" });
  const [posthog, setPosthog] = useState({ posthogHost: "https://us.posthog.com", posthogProjectId: "", posthogApiKey: "", pageviewEvent: "$pageview", signupEvent: "user_signed_up", paidEvent: "subscription_started" });
  const [subreddit, setSubreddit] = useState("");
  const [gscProperties, setGscProperties] = useState<Array<{ siteUrl: string; permissionLevel: string }>>([]);
  const [gscProperty, setGscProperty] = useState("");
  const [busy, setBusy] = useState("");
  const workspaceId = data.workspace?.id ?? "";
  const connection = (provider: string) => data.platformConnections?.find((item) => item.provider === provider && item.status === "connected");
  const oauthConnect = (provider: "x" | "linkedin" | "reddit" | "google_search_console") => { window.location.assign(`/api/connections/start?provider=${provider}&workspaceId=${encodeURIComponent(workspaceId)}`); };
  const manage = async (payload: Record<string, unknown>) => { setBusy(String(payload.provider ?? payload.action)); try { const response = await fetch("/api/connections/manage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, ...payload }) }); if (!response.ok) { alert(await response.text()); return; } window.location.reload(); } finally { setBusy(""); } };
  const loadGscProperties = async () => { setBusy("list_search_console_properties"); try { const response = await fetch("/api/connections/manage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, action: "list_search_console_properties" }) }); if (!response.ok) { alert(await response.text()); return; } const body = await response.json() as { properties?: Array<{ siteUrl: string; permissionLevel: string }> }; setGscProperties(body.properties ?? []); } finally { setBusy(""); } };
  const providers = [
    { id: "wordpress", name: "WordPress / CMS", note: zh ? "填写站点地址、用户名和 Application Password；Atlas 加密保存。" : "Enter the site URL, username, and Application Password; Atlas stores them encrypted." },
    { id: "x", name: "X", note: zh ? "通过 X 官方 OAuth 授权发帖权限。" : "Authorize posting through X's official OAuth flow." },
    { id: "linkedin", name: "LinkedIn", note: zh ? "通过 LinkedIn 官方 OAuth 授权发布权限。" : "Authorize publishing through LinkedIn's official OAuth flow." },
    { id: "reddit", name: "Reddit", note: zh ? "通过 Reddit OAuth 连接；每条内容仍需审批。" : "Connect with Reddit OAuth; every post still requires approval." },
    { id: "analytics", name: "Atlas Tracking", note: zh ? "UTM、站内事件与转化归因已经启用。" : "UTM, first-party events, and attribution are enabled." },
    { id: "posthog", name: "PostHog", note: zh ? "同步真实访问、注册与付费事件，供 Growth Operator 决策。" : "Sync live visits, signup, and paid events into Growth Operator decisions." },
    { id: "google_search_console", name: "Google Search Console", note: zh ? "只读同步已验证 HTTPS 属性的搜索词、曝光、点击和排名，用于发现 SEO 内容机会。" : "Read-only sync of verified HTTPS properties, queries, impressions, clicks, and ranking to discover SEO content opportunities." },
    { id: "xiaohongshu", name: "小红书", note: zh ? "仅人工发布与链接回填，不使用非官方自动化。" : "Manual publishing and URL receipts only; no unofficial automation." },
  ];
  return <><section className="view-title"><p>OBSERVE · PUBLISH · MEASURE</p><h1>{t.connections}</h1><span>{t.connectionLead}</span><button className="review" onClick={() => void onReflect()}>{zh ? "立即生成今日复盘" : "Run today's reflection"}</button></section>
    <section className="connection-blueprint"><header><div><p>WORKSPACE CONNECTION VAULT</p><h2>{zh ? "每个工作区连接自己的账号" : "Every workspace connects its own accounts"}</h2></div><span>{zh ? "OAuth · 加密 Token · 可随时断开" : "OAuth · encrypted tokens · revocable"}</span></header><div>{[{ n: "01", z: "官方授权", e: "Official authorization", d: zh ? "Atlas 只保存平台返回的最小权限 Token，不接收账号密码。" : "Atlas stores least-privilege tokens and never asks for platform passwords." }, { n: "02", z: "工作区隔离", e: "Workspace isolation", d: zh ? "连接仅属于当前工作区，不会被其他产品或成员误用。" : "Connections belong only to the current workspace." }, { n: "03", z: "审批后发布", e: "Approval-gated publishing", d: zh ? "内容批准后才可以进入幂等发布队列。" : "Only approved assets enter the idempotent publishing queue." }, { n: "04", z: "回执与复盘", e: "Receipts and reflection", d: zh ? "保存公开链接并结合 UTM 与转化数据复盘。" : "Public receipts combine with UTM and conversion data." }].map((item) => <article key={item.n}><b>{item.n}</b><strong>{zh ? item.z : item.e}</strong><span>{item.d}</span></article>)}</div></section>
    <div className="connection-grid provider-grid">{providers.map((item) => { const active = item.id === "analytics" ? Boolean(data.publishing?.analytics) : Boolean(connection(item.id)); const appReady = item.id === "x" || item.id === "linkedin" || item.id === "reddit" || item.id === "google_search_console" ? Boolean(data.oauthApps?.[item.id]) : true; const gscMetadata = connection("google_search_console")?.metadata as { siteUrl?: string } | undefined; return <article key={item.id}><div><span>{item.id === "analytics" || item.id === "posthog" || item.id === "google_search_console" ? (zh ? "数据" : "Analytics") : (zh ? "分发" : "Distribution")}</span><b className={active ? "connected" : "available"}>{active ? t.connected : item.id === "xiaohongshu" ? (zh ? "仅手动" : "Manual only") : appReady ? (zh ? "可连接" : "Connect") : (zh ? "应用待配置" : "App setup required")}</b></div><h2>{item.name}</h2><p>{item.note}</p>{active && connection(item.id)?.accountLabel && <small>{connection(item.id)?.accountLabel}</small>}
      {item.id === "wordpress" && !active && <div className="connection-form"><input placeholder="https://your-site.com" value={wordpress.siteUrl} onChange={(e) => setWordpress({ ...wordpress, siteUrl: e.target.value })} /><input placeholder={zh ? "用户名" : "Username"} value={wordpress.username} onChange={(e) => setWordpress({ ...wordpress, username: e.target.value })} /><input type="password" autoComplete="new-password" placeholder="Application Password" value={wordpress.applicationPassword} onChange={(e) => setWordpress({ ...wordpress, applicationPassword: e.target.value })} /><button disabled={busy === "connect_wordpress" || !wordpress.siteUrl || !wordpress.username || !wordpress.applicationPassword} onClick={() => void manage({ action: "connect_wordpress", ...wordpress })}>{zh ? "验证并连接" : "Verify & connect"}</button></div>}
      {item.id === "posthog" && !active && <div className="connection-form"><select value={posthog.posthogHost} onChange={(e) => setPosthog({ ...posthog, posthogHost: e.target.value })}><option value="https://us.posthog.com">PostHog US</option><option value="https://eu.posthog.com">PostHog EU</option></select><input inputMode="numeric" placeholder={zh ? "Project ID" : "Project ID"} value={posthog.posthogProjectId} onChange={(e) => setPosthog({ ...posthog, posthogProjectId: e.target.value })} /><input type="password" autoComplete="new-password" placeholder="Personal API Key (Query Read)" value={posthog.posthogApiKey} onChange={(e) => setPosthog({ ...posthog, posthogApiKey: e.target.value })} /><input placeholder="$pageview" value={posthog.pageviewEvent} onChange={(e) => setPosthog({ ...posthog, pageviewEvent: e.target.value })} /><input placeholder="user_signed_up" value={posthog.signupEvent} onChange={(e) => setPosthog({ ...posthog, signupEvent: e.target.value })} /><input placeholder="subscription_started" value={posthog.paidEvent} onChange={(e) => setPosthog({ ...posthog, paidEvent: e.target.value })} /><button disabled={busy === "connect_posthog" || !posthog.posthogProjectId || !posthog.posthogApiKey} onClick={() => void manage({ action: "connect_posthog", ...posthog })}>{zh ? "验证、连接并同步" : "Verify, connect & sync"}</button></div>}
      {item.id === "posthog" && active && <div className="connection-sync"><small>{connection("posthog")?.lastSyncAt ? (zh ? `最近同步 ${new Date(connection("posthog")!.lastSyncAt!).toLocaleString("zh-CN")}` : `Last synced ${new Date(connection("posthog")!.lastSyncAt!).toLocaleString("en-US")}`) : (zh ? "等待首次同步" : "Waiting for first sync")}</small><button disabled={busy === "sync_posthog"} onClick={() => void manage({ action: "sync_posthog" })}>{zh ? "立即同步" : "Sync now"}</button></div>}
      {item.id === "google_search_console" && !active && <button disabled={!appReady} onClick={() => oauthConnect("google_search_console")}>{zh ? "连接 Google Search Console" : "Connect Google Search Console"}</button>}
      {item.id === "google_search_console" && active && !gscMetadata?.siteUrl && <div className="connection-form"><button disabled={busy === "list_search_console_properties"} onClick={() => void loadGscProperties()}>{zh ? "读取已验证属性" : "Load verified properties"}</button>{gscProperties.length > 0 && <><select value={gscProperty} onChange={(e) => setGscProperty(e.target.value)}><option value="">{zh ? "选择 HTTPS 属性" : "Select HTTPS property"}</option>{gscProperties.map((property) => <option value={property.siteUrl} key={property.siteUrl}>{property.siteUrl}</option>)}</select><button disabled={!gscProperty || busy === "select_search_console_property"} onClick={() => void manage({ action: "select_search_console_property", siteUrl: gscProperty })}>{zh ? "保存属性" : "Save property"}</button></>}</div>}
      {item.id === "google_search_console" && active && gscMetadata?.siteUrl && <div className="connection-sync"><small>{gscMetadata.siteUrl}</small><button disabled={busy === "sync_search_console"} onClick={() => void manage({ action: "sync_search_console" })}>{zh ? "立即同步洞察" : "Sync insights now"}</button></div>}
      {(item.id === "x" || item.id === "linkedin" || item.id === "reddit") && !active && <button disabled={!appReady} onClick={() => oauthConnect(item.id)}>{zh ? `连接 ${item.name}` : `Connect ${item.name}`}</button>}
      {item.id === "reddit" && active && <div className="connection-form inline"><input placeholder="r/SideProject" value={subreddit} onChange={(e) => setSubreddit(e.target.value)} /><button disabled={!subreddit || busy === "update_reddit"} onClick={() => void manage({ action: "update_reddit", subreddit })}>{zh ? "保存发布社区" : "Save subreddit"}</button></div>}
      {active && !["analytics"].includes(item.id) && <button className="disconnect" disabled={busy === item.id} onClick={() => void manage({ action: "disconnect", provider: item.id })}>{zh ? "断开连接" : "Disconnect"}</button>}
      <footer>{active ? (zh ? "仅当前工作区可使用" : "Available only to this workspace") : item.id === "xiaohongshu" ? (zh ? "不会自动发布" : "No automatic publishing") : (zh ? "尚未授权" : "Not authorized")}</footer></article>; })}</div></>;
}
function ApprovalDrawer({ t, approval, task, onClose, onMutate }: { t: typeof copy.zh; approval: Approval; task?: AtlasV2Data["tasks"][number]; onClose: () => void; onMutate: (action: string, id: number, message: string, extra?: Record<string, unknown>) => void }) {
  const zh = t === copy.zh;
  const [feedbackReason, setFeedbackReason] = useState("");
  const [saveAsRule, setSaveAsRule] = useState(true);
  return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="approval-drawer" onMouseDown={(event) => event.stopPropagation()}><button className="drawer-close" onClick={onClose}>×</button><span className={`risk ${riskTone(approval.riskLevel)}`}>{t.level} {approval.riskLevel}</span><p>APPROVAL REQUEST</p><h2>{approval.title}</h2><section><h3>{t.reason}</h3><span>{approval.reason}</span></section><section><h3>{t.generated}</h3><pre>{approval.payload}</pre></section><section><h3>{t.evidence}</h3><ul>{task?.evidence.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="founder-feedback-input"><h3>{zh ? "给 Atlas 的反馈（拒绝时建议填写）" : "Feedback for Atlas (recommended when rejecting)"}</h3><textarea value={feedbackReason} onChange={(event) => setFeedbackReason(event.target.value)} placeholder={zh ? "例如：不要使用夸张营销语气，这不符合我们的品牌表达。" : "Example: Avoid exaggerated marketing language; it does not match our brand."} /><label><input type="checkbox" checked={saveAsRule} onChange={(event) => setSaveAsRule(event.target.checked)} />{zh ? "把原因保存为可撤销的公司规则" : "Save this reason as a reversible company rule"}</label></section><section className="drawer-action"><button className="approve" onClick={() => onMutate("approve", approval.id, t.approveSuccess, { reason: feedbackReason || undefined })}>{t.approve}</button><button onClick={() => onMutate("defer", approval.id, t.deferSuccess, { reason: feedbackReason || undefined })}>{t.defer}</button><button className="reject" onClick={() => onMutate("reject", approval.id, t.rejectSuccess, { reason: feedbackReason || undefined, saveAsRule: saveAsRule && Boolean(feedbackReason.trim()) })}>{t.reject}</button></section></aside></div>;
}
