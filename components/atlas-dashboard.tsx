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
type View = "today" | "product-intelligence" | "campaigns" | "approvals" | "activity" | "opportunities" | "memory" | "agents" | "connections";

const copy = {
  zh: {
    workspace: "工作空间", today: "今日汇报", approvals: "审批队列", activity: "执行记录", opportunities: "增长机会", campaigns: "增长活动", memory: "公司记忆", agents: "数字员工", connections: "连接", active: "运行中", todayTitle: "Atlas 已经开始工作。", todayLead: "增长执行官正在观察市场、准备执行，并将外部操作交给你审批。", completed: "昨日已完成", planned: "今日计划", waiting: "等待审批", risks: "风险提醒", discoveries: "最新发现", metrics: "关键指标", approve: "批准执行", reject: "拒绝", defer: "稍后处理", viewReason: "查看理由与证据", generated: "已准备内容", evidence: "数据依据", expected: "预期结果", effort: "预计耗时", risk: "风险等级", level: "等级", task: "任务", status: "状态", source: "来源", confidence: "置信度", action: "建议行动", convert: "转为任务", save: "收藏", ignore: "忽略", running: "正在执行", completedLabel: "已完成", failed: "失败", approval: "待审批", cancelled: "已取消", activityLead: "这是 Atlas 可审计的执行记录；只保存数据来源、决策摘要、工具和输出。", memoryLead: "每一条记忆都包含来源、置信度与最后验证时间。", agentLead: "数字员工共享同一工作区记忆，并通过审批执行外部动作。", connectionLead: "外部连接负责提供观察数据与可执行能力。当前未授权连接使用模拟数据。", connected: "已连接", mock: "模拟数据", available: "可连接", pending: "待处理", approved: "已批准", rejected: "已拒绝", deferred: "已延后", auto: "自动化等级", schedule: "运行频率", tools: "可用工具", lastSync: "最近同步", reason: "为什么现在做", approvalQueue: "等待你确认的外部动作", noApprovals: "当前没有等待审批的操作", company: "Project Atlas", role: "增长执行官", observe: "观察", analyze: "分析", plan: "计划", execute: "执行", measure: "衡量", reflect: "复盘", updated: "已更新", approveSuccess: "Atlas 已收到批准，内容可以进入发布流程。", rejectSuccess: "该操作已被拒绝，Atlas 不会执行。", deferSuccess: "该操作已延后处理。", opportunitySaved: "机会已加入关注列表。", opportunityIgnored: "机会已忽略。", visits: "访问", signups: "注册", paid: "付费", riskMessage: "等级 2 的操作需要你的批准；Atlas 不会自动发布或修改公开内容。", opportunityLead: "增长执行官主动发现的可参与话题、关键词变化与竞品信号。", success: "成功率", scheduled: "已排程", validated: "已验证", unverified: "待验证", saved: "已收藏", ignored: "已忽略", onboardingTitle: "设置你的产品", onboardingLead: "Atlas 将抓取公开产品页面，生成第一份产品与增长分析。", productName: "产品名称", productUrl: "产品 URL", productIntro: "产品简介（可选）", growthGoal: "当前增长目标（可选）", startAnalysis: "开始分析", analyzing: "正在分析真实网页并写入工作台…", analysisError: "分析失败",
  },
  en: {
    workspace: "WORKSPACE", today: "Today", approvals: "Approval Queue", activity: "Activity", opportunities: "Opportunities", campaigns: "Campaigns", memory: "Memory", agents: "Agents", connections: "Connections", active: "Active", todayTitle: "Atlas is already working.", todayLead: "Growth Operator is observing the market, preparing work, and sending external actions for your approval.", completed: "Completed yesterday", planned: "Today's plan", waiting: "Waiting approval", risks: "Risk notice", discoveries: "Latest discoveries", metrics: "Key metrics", approve: "Approve", reject: "Reject", defer: "Defer", viewReason: "Reason & evidence", generated: "Prepared output", evidence: "Evidence", expected: "Expected outcome", effort: "Estimated effort", risk: "Risk level", level: "Level", task: "Task", status: "Status", source: "Source", confidence: "Confidence", action: "Suggested action", convert: "Create task", save: "Save", ignore: "Ignore", running: "Running", completedLabel: "Completed", failed: "Failed", approval: "Waiting approval", cancelled: "Cancelled", activityLead: "This is Atlas's auditable activity log. It stores data sources, decision summaries, tools, and outputs—not private model reasoning.", memoryLead: "Every memory has a source, confidence score, and last verified time.", agentLead: "Digital employees share workspace memory and use approvals for external actions.", connectionLead: "Connections provide observation data and executable capabilities. Unauthorized connections use mock data.", connected: "Connected", mock: "Mock data", available: "Available", pending: "Pending", approved: "Approved", rejected: "Rejected", deferred: "Deferred", auto: "Autonomy level", schedule: "Schedule", tools: "Tools", lastSync: "Last sync", reason: "Why now", approvalQueue: "External actions waiting for you", noApprovals: "No external actions are waiting for approval", company: "Project Atlas", role: "Growth Operator", observe: "Observe", analyze: "Analyze", plan: "Plan", execute: "Execute", measure: "Measure", reflect: "Reflect", updated: "Updated", approveSuccess: "Atlas received approval. The content can move into publishing.", rejectSuccess: "This action was rejected. Atlas will not execute it.", deferSuccess: "This action was deferred.", opportunitySaved: "Opportunity saved to the watch list.", opportunityIgnored: "Opportunity ignored.", visits: "Visits", signups: "Signups", paid: "Paid", riskMessage: "Level 2 actions need your approval. Atlas never publishes or changes public content automatically.", opportunityLead: "Growth Operator proactively finds relevant conversations, keyword movement, and competitor signals.", success: "success", scheduled: "Scheduled", validated: "Validated", unverified: "Unverified", saved: "Saved", ignored: "Ignored", onboardingTitle: "Set up your product", onboardingLead: "Atlas will fetch the public product page and generate the first product and growth analysis.", productName: "Product name", productUrl: "Product URL", productIntro: "Product intro (optional)", growthGoal: "Current growth goal (optional)", startAnalysis: "Start analysis", analyzing: "Analyzing the live website and updating your workspace…", analysisError: "Analysis failed",
  },
} as const;

const nav: { id: View; icon: string; key: keyof typeof copy.zh; label?: Record<Locale, string> }[] = [
  { id: "today", icon: "◒", key: "today" }, { id: "product-intelligence", icon: "◫", key: "today", label: { zh: "产品洞察", en: "Product Intelligence" } }, { id: "opportunities", icon: "✦", key: "opportunities" }, { id: "campaigns", icon: "◉", key: "campaigns" }, { id: "approvals", icon: "✓", key: "approvals" }, { id: "activity", icon: "≋", key: "activity" }, { id: "memory", icon: "◈", key: "memory" }, { id: "agents", icon: "◎", key: "agents" }, { id: "connections", icon: "↗", key: "connections" },
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

  async function mutate(action: string, id: number, message: string) {
    const response = await fetch(`/api/atlas-v2${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, id }) });
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
      <div className="v2-brand"><span>▲</span><div><strong>ATLAS</strong><small>{locale === "zh" ? "增长执行官" : "GROWTH OPERATOR"}</small></div></div>
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
  return <><section className="today-intro"><div><p>{t.role} · {t.active}</p><h1>{t.todayTitle}</h1><span>{t.todayLead}</span></div><div className="today-summary"><strong>{data.metrics.yesterdayCompleted}</strong><span>{t.completed}</span><i /> <strong>{tasks.length}</strong><span>{t.planned}</span><i /> <strong>{approvals.length}</strong><span>{t.waiting}</span></div></section>
    <section className="company-runtime-status"><div><span className="live" /><div><small>COMPANY RUNTIME</small><strong>{companySettings?.mode === "paused" ? (zh ? "已由 Founder 暂停" : "Paused by founder") : (zh ? "Atlas 正在经营公司" : "Atlas is operating the company")}</strong><p>{companyCycle?.summary || (zh ? "点击立即运行，启动首个统一公司运营周期。" : "Run the first unified company cycle when you are ready.")}</p></div></div><dl><div><dt>{zh ? "模式" : "Mode"}</dt><dd>{companySettings?.mode ?? "copilot"}</dd></div><div><dt>{zh ? "今日动作" : "Actions today"}</dt><dd>{companyRuntime?.usage.actionsCount ?? 0}/{companySettings?.dailyActionLimit ?? 0}</dd></div><div><dt>{zh ? "下次运行" : "Next run"}</dt><dd>{companySettings?.nextTickAt ? new Date(companySettings.nextTickAt).toLocaleTimeString(zh ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }) : (zh ? "待调度" : "Awaiting scheduler")}</dd></div></dl><button onClick={() => void onRunRuntime()}>{zh ? "立即运行" : "Run now"}</button></section>
    <section className={`runtime-health ${runtimeSchedule?.lastStatus === "failed" || latestJob?.status === "failed" ? "has-error" : ""}`}><div><span className="live" /><div><small>BACKGROUND GROWTH RUNTIME</small><strong>{runtimeSchedule ? (zh ? `每日 ${runtimeSchedule.localTime} · ${runtimeSchedule.timezone}` : `Daily ${runtimeSchedule.localTime} · ${runtimeSchedule.timezone}`) : (zh ? "正在初始化后台计划" : "Initializing background schedule")}</strong></div></div><dl><div><dt>{zh ? "自动执行" : "Automation"}</dt><dd><button className={`autonomy-toggle ${data.workspace?.autonomyEnabled === false ? "off" : ""}`} onClick={() => void onToggleAutonomy(data.workspace?.autonomyEnabled === false)}>{data.workspace?.autonomyEnabled === false ? (zh ? "关闭" : "Off") : (zh ? "开启" : "On")}</button></dd></div><div><dt>{zh ? "上次运行" : "Last run"}</dt><dd>{runtimeSchedule?.lastRunAt ? new Date(runtimeSchedule.lastRunAt).toLocaleString(zh ? "zh-CN" : "en-US") : (zh ? "尚未运行" : "Not run yet")}</dd></div><div><dt>{zh ? "最新任务" : "Latest job"}</dt><dd className={`state ${statusTone(latestJob?.status ?? runtimeSchedule?.lastStatus ?? "scheduled")}`}>{statusText(latestJob?.status ?? runtimeSchedule?.lastStatus ?? "scheduled", t)}</dd></div></dl>{(runtimeSchedule?.lastError || latestJob?.lastError) && <p>{zh ? "后台任务失败，Atlas 会按照重试策略安全恢复。" : "The background job failed and will recover through the retry policy."}</p>}</section>
    <ObservationHealth data={data} zh={zh} onScan={onObserve} />
    <AnalyticsHealth data={data} zh={zh} />
    <section className="today-grid"><div className="today-primary">{reflection && <FounderDailyBrief reflection={reflection} date={latest.snapshotDate} zh={zh} onReflect={onReflect} />}<Panel title={t.planned} eyebrow="NEXT BEST ACTIONS"><div className="task-stack">{tasks.map((task) => <TaskCard key={task.id} task={task} t={t} />)}</div></Panel><Panel title={t.discoveries} eyebrow="TOP OPPORTUNITY"><div className="discovery-list top-opportunity">{data.opportunities.slice(0, 2).map((item) => <div key={item.id}><span>{item.signal}</span><div><strong>{item.title}</strong><small>{item.summary}</small></div><b>{item.confidence}%</b></div>)}</div></Panel><Panel title={t.activity} eyebrow="RECENT ACTIVITY"><div className="activity-mini">{data.runs.slice(0, 3).map((run) => <div key={run.id}><span className={`run-dot ${statusTone(run.status)}`} /><div><strong>{run.task}</strong><small>{run.startedAt} · {statusText(run.status, t)}</small></div></div>)}</div></Panel></div>
      <aside className="today-side"><Panel title={t.waiting} eyebrow="APPROVAL QUEUE"><div className="approval-mini">{approvals.map((item) => <button key={item.id} onClick={() => onSelectApproval(item)}><span className={`risk ${riskTone(item.riskLevel)}`}>{t.level} {item.riskLevel}</span><strong>{item.title}</strong><small>{item.createdAt} · {item.actionType}</small><i>→</i></button>)}</div></Panel><Panel title={t.metrics} eyebrow="YESTERDAY"><div className="metric-list"><div><span>{t.visits}</span><strong>{data.metrics.visits.toLocaleString()}</strong></div><div><span>{t.signups}</span><strong>{data.metrics.signups}</strong></div><div><span>{t.paid}</span><strong>{data.metrics.paid}</strong></div><div><span>CVR</span><strong>{data.metrics.conversion}%</strong></div></div></Panel><div className="risk-note"><span>!</span><div><strong>{t.risks}</strong><p>{t.riskMessage}</p></div></div></aside></section></>;
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
    {asset.status === "approved" && <div className="publish-ready"><span>✓</span><div><strong>{zh ? "内容已批准，可以发布" : "Approved and publish ready"}</strong><small>{providerReady ? (zh ? "该渠道已配置，可由 Atlas 通过官方接口发布并保存回执。" : "This provider is configured. Atlas can publish through its official API and save the receipt.") : (zh ? "该渠道尚未配置；仍可复制内容并回填发布链接。" : "This provider is not configured yet. You can still copy the content and record the live URL.")}</small></div>{providerReady && <button disabled={Boolean(busy)} onClick={() => void run("publish", "publish_campaign_asset")}>{busy === "publish" ? (zh ? "发布中…" : "Publishing…") : (zh ? "Atlas 自动发布" : "Publish with Atlas")}</button>}</div>}
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
function Memory({ t, data }: { t: typeof copy.zh; data: AtlasV2Data }) { return <><section className="view-title"><p>COMPANY MEMORY</p><h1>{t.memory}</h1><span>{t.memoryLead}</span></section><div className="memory-grid">{data.memories.map((item) => <article key={item.id}><header><span>{item.type}</span><span className={`state ${statusTone(item.status)}`}>{statusText(item.status, t)}</span></header><h2>{item.title}</h2><p>{item.content}</p><footer><span>{t.source}: {item.source}</span><b>{item.confidence}% · {item.verifiedAt}</b></footer></article>)}</div></> }
function Agents({ t, data }: { t: typeof copy.zh; data: AtlasV2Data }) { return <><section className="view-title"><p>AGENT RUNTIME</p><h1>{t.agents}</h1><span>{t.agentLead}</span></section><div className="agent-grid">{data.agents.map((agent) => <article key={agent.id}><div className="agent-avatar">{agent.name.slice(0, 1)}</div><div className="agent-heading"><span className={`live ${agent.status === "running" ? "" : "idle"}`} /><small>{statusText(agent.status, t)}</small></div><h2>{agent.name}</h2><p>{agent.role}</p><span className="agent-description">{agent.description}</span><dl><div><dt>{t.auto}</dt><dd>{t.level} {agent.autonomyLevel}</dd></div><div><dt>{t.schedule}</dt><dd>{agent.schedule}</dd></div><div><dt>{t.tools}</dt><dd>{agent.tools.join(" · ")}</dd></div></dl><footer><span>{agent.currentTask}</span><b>{agent.successRate}% {t.success}</b></footer></article>)}</div></> }
function Connections({ t, data, onReflect }: { t: typeof copy.zh; data: AtlasV2Data; onReflect: () => Promise<void> }) {
  const zh = t.workspace === copy.zh.workspace;
  const [wordpress, setWordpress] = useState({ siteUrl: "", username: "", applicationPassword: "" });
  const [posthog, setPosthog] = useState({ posthogHost: "https://us.posthog.com", posthogProjectId: "", posthogApiKey: "", pageviewEvent: "$pageview", signupEvent: "user_signed_up", paidEvent: "subscription_started" });
  const [subreddit, setSubreddit] = useState("");
  const [busy, setBusy] = useState("");
  const workspaceId = data.workspace?.id ?? "";
  const connection = (provider: string) => data.platformConnections?.find((item) => item.provider === provider && item.status === "connected");
  const oauthConnect = (provider: "x" | "linkedin" | "reddit") => { window.location.assign(`/api/connections/start?provider=${provider}&workspaceId=${encodeURIComponent(workspaceId)}`); };
  const manage = async (payload: Record<string, unknown>) => { setBusy(String(payload.provider ?? payload.action)); try { const response = await fetch("/api/connections/manage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workspaceId, ...payload }) }); if (!response.ok) { alert(await response.text()); return; } window.location.reload(); } finally { setBusy(""); } };
  const providers = [
    { id: "wordpress", name: "WordPress / CMS", note: zh ? "填写站点地址、用户名和 Application Password；Atlas 加密保存。" : "Enter the site URL, username, and Application Password; Atlas stores them encrypted." },
    { id: "x", name: "X", note: zh ? "通过 X 官方 OAuth 授权发帖权限。" : "Authorize posting through X's official OAuth flow." },
    { id: "linkedin", name: "LinkedIn", note: zh ? "通过 LinkedIn 官方 OAuth 授权发布权限。" : "Authorize publishing through LinkedIn's official OAuth flow." },
    { id: "reddit", name: "Reddit", note: zh ? "通过 Reddit OAuth 连接；每条内容仍需审批。" : "Connect with Reddit OAuth; every post still requires approval." },
    { id: "analytics", name: "Atlas Tracking", note: zh ? "UTM、站内事件与转化归因已经启用。" : "UTM, first-party events, and attribution are enabled." },
    { id: "posthog", name: "PostHog", note: zh ? "同步真实访问、注册与付费事件，供 Growth Operator 决策。" : "Sync live visits, signup, and paid events into Growth Operator decisions." },
    { id: "xiaohongshu", name: "小红书", note: zh ? "仅人工发布与链接回填，不使用非官方自动化。" : "Manual publishing and URL receipts only; no unofficial automation." },
  ];
  return <><section className="view-title"><p>OBSERVE · PUBLISH · MEASURE</p><h1>{t.connections}</h1><span>{t.connectionLead}</span><button className="review" onClick={() => void onReflect()}>{zh ? "立即生成今日复盘" : "Run today's reflection"}</button></section>
    <section className="connection-blueprint"><header><div><p>WORKSPACE CONNECTION VAULT</p><h2>{zh ? "每个工作区连接自己的账号" : "Every workspace connects its own accounts"}</h2></div><span>{zh ? "OAuth · 加密 Token · 可随时断开" : "OAuth · encrypted tokens · revocable"}</span></header><div>{[{ n: "01", z: "官方授权", e: "Official authorization", d: zh ? "Atlas 只保存平台返回的最小权限 Token，不接收账号密码。" : "Atlas stores least-privilege tokens and never asks for platform passwords." }, { n: "02", z: "工作区隔离", e: "Workspace isolation", d: zh ? "连接仅属于当前工作区，不会被其他产品或成员误用。" : "Connections belong only to the current workspace." }, { n: "03", z: "审批后发布", e: "Approval-gated publishing", d: zh ? "内容批准后才可以进入幂等发布队列。" : "Only approved assets enter the idempotent publishing queue." }, { n: "04", z: "回执与复盘", e: "Receipts and reflection", d: zh ? "保存公开链接并结合 UTM 与转化数据复盘。" : "Public receipts combine with UTM and conversion data." }].map((item) => <article key={item.n}><b>{item.n}</b><strong>{zh ? item.z : item.e}</strong><span>{item.d}</span></article>)}</div></section>
    <div className="connection-grid provider-grid">{providers.map((item) => { const active = item.id === "analytics" ? Boolean(data.publishing?.analytics) : Boolean(connection(item.id)); const appReady = item.id === "x" || item.id === "linkedin" || item.id === "reddit" ? Boolean(data.oauthApps?.[item.id]) : true; return <article key={item.id}><div><span>{item.id === "analytics" ? (zh ? "数据" : "Analytics") : (zh ? "分发" : "Distribution")}</span><b className={active ? "connected" : "available"}>{active ? t.connected : item.id === "xiaohongshu" ? (zh ? "仅手动" : "Manual only") : appReady ? (zh ? "可连接" : "Connect") : (zh ? "应用待配置" : "App setup required")}</b></div><h2>{item.name}</h2><p>{item.note}</p>{active && connection(item.id)?.accountLabel && <small>{connection(item.id)?.accountLabel}</small>}
      {item.id === "wordpress" && !active && <div className="connection-form"><input placeholder="https://your-site.com" value={wordpress.siteUrl} onChange={(e) => setWordpress({ ...wordpress, siteUrl: e.target.value })} /><input placeholder={zh ? "用户名" : "Username"} value={wordpress.username} onChange={(e) => setWordpress({ ...wordpress, username: e.target.value })} /><input type="password" autoComplete="new-password" placeholder="Application Password" value={wordpress.applicationPassword} onChange={(e) => setWordpress({ ...wordpress, applicationPassword: e.target.value })} /><button disabled={busy === "connect_wordpress" || !wordpress.siteUrl || !wordpress.username || !wordpress.applicationPassword} onClick={() => void manage({ action: "connect_wordpress", ...wordpress })}>{zh ? "验证并连接" : "Verify & connect"}</button></div>}
      {item.id === "posthog" && !active && <div className="connection-form"><select value={posthog.posthogHost} onChange={(e) => setPosthog({ ...posthog, posthogHost: e.target.value })}><option value="https://us.posthog.com">PostHog US</option><option value="https://eu.posthog.com">PostHog EU</option></select><input inputMode="numeric" placeholder={zh ? "Project ID" : "Project ID"} value={posthog.posthogProjectId} onChange={(e) => setPosthog({ ...posthog, posthogProjectId: e.target.value })} /><input type="password" autoComplete="new-password" placeholder="Personal API Key (Query Read)" value={posthog.posthogApiKey} onChange={(e) => setPosthog({ ...posthog, posthogApiKey: e.target.value })} /><input placeholder="$pageview" value={posthog.pageviewEvent} onChange={(e) => setPosthog({ ...posthog, pageviewEvent: e.target.value })} /><input placeholder="user_signed_up" value={posthog.signupEvent} onChange={(e) => setPosthog({ ...posthog, signupEvent: e.target.value })} /><input placeholder="subscription_started" value={posthog.paidEvent} onChange={(e) => setPosthog({ ...posthog, paidEvent: e.target.value })} /><button disabled={busy === "connect_posthog" || !posthog.posthogProjectId || !posthog.posthogApiKey} onClick={() => void manage({ action: "connect_posthog", ...posthog })}>{zh ? "验证、连接并同步" : "Verify, connect & sync"}</button></div>}
      {item.id === "posthog" && active && <div className="connection-sync"><small>{connection("posthog")?.lastSyncAt ? (zh ? `最近同步 ${new Date(connection("posthog")!.lastSyncAt!).toLocaleString("zh-CN")}` : `Last synced ${new Date(connection("posthog")!.lastSyncAt!).toLocaleString("en-US")}`) : (zh ? "等待首次同步" : "Waiting for first sync")}</small><button disabled={busy === "sync_posthog"} onClick={() => void manage({ action: "sync_posthog" })}>{zh ? "立即同步" : "Sync now"}</button></div>}
      {(item.id === "x" || item.id === "linkedin" || item.id === "reddit") && !active && <button disabled={!appReady} onClick={() => oauthConnect(item.id)}>{zh ? `连接 ${item.name}` : `Connect ${item.name}`}</button>}
      {item.id === "reddit" && active && <div className="connection-form inline"><input placeholder="r/SideProject" value={subreddit} onChange={(e) => setSubreddit(e.target.value)} /><button disabled={!subreddit || busy === "update_reddit"} onClick={() => void manage({ action: "update_reddit", subreddit })}>{zh ? "保存发布社区" : "Save subreddit"}</button></div>}
      {active && !["analytics"].includes(item.id) && <button className="disconnect" disabled={busy === item.id} onClick={() => void manage({ action: "disconnect", provider: item.id })}>{zh ? "断开连接" : "Disconnect"}</button>}
      <footer>{active ? (zh ? "仅当前工作区可使用" : "Available only to this workspace") : item.id === "xiaohongshu" ? (zh ? "不会自动发布" : "No automatic publishing") : (zh ? "尚未授权" : "Not authorized")}</footer></article>; })}</div></>;
}
function ApprovalDrawer({ t, approval, task, onClose, onMutate }: { t: typeof copy.zh; approval: Approval; task?: AtlasV2Data["tasks"][number]; onClose: () => void; onMutate: (action: string, id: number, message: string) => void }) { return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="approval-drawer" onMouseDown={(event) => event.stopPropagation()}><button className="drawer-close" onClick={onClose}>×</button><span className={`risk ${riskTone(approval.riskLevel)}`}>{t.level} {approval.riskLevel}</span><p>APPROVAL REQUEST</p><h2>{approval.title}</h2><section><h3>{t.reason}</h3><span>{approval.reason}</span></section><section><h3>{t.generated}</h3><pre>{approval.payload}</pre></section><section><h3>{t.evidence}</h3><ul>{task?.evidence.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="drawer-action"><button className="approve" onClick={() => onMutate("approve", approval.id, t.approveSuccess)}>{t.approve}</button><button onClick={() => onMutate("defer", approval.id, t.deferSuccess)}>{t.defer}</button><button className="reject" onClick={() => onMutate("reject", approval.id, t.rejectSuccess)}>{t.reject}</button></section></aside></div> }
