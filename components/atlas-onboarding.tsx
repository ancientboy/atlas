"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { analysisProgress, analysisStage, onboardingCanSubmit, onboardingDestination, type AnalysisStage } from "../lib/route-state";

type AnalysisStatus = "idle" | "pending" | "running" | "completed" | "failed";

export function AtlasOnboarding({ newProduct = false, initialWorkspaceId = "" }: { newProduct?: boolean; initialWorkspaceId?: string }) {
  const router = useRouter();
  const [locale, setLocale] = useState<"zh" | "en">(() => { if (typeof window === "undefined") return "zh"; return window.localStorage.getItem("atlas-locale") === "en" ? "en" : "zh"; });
  const [product, setProduct] = useState({ name: "", url: "", description: "", growthGoal: "" });
  const newProductFlow = newProduct;
  const [targetWorkspaceId, setTargetWorkspaceId] = useState(initialWorkspaceId);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<AnalysisStage>("starting");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const zh = locale === "zh";
  const tr = (en: string, cn: string) => zh ? cn : en;
  const isAnalyzing = analysisStatus === "pending" || analysisStatus === "running";

  async function loadWorkspace() {
    setIsChecking(true);
    setError("");
    if (newProductFlow && !targetWorkspaceId) { setProduct({ name: "", url: "", description: "", growthGoal: "" }); setAnalysisStatus("idle"); setIsChecking(false); return; }
    try {
      const response = await fetch(`/api/atlas-v2${targetWorkspaceId ? `?workspaceId=${encodeURIComponent(targetWorkspaceId)}` : ""}`);
      if (response.status === 401) { router.replace("/login?return_to=/onboarding"); return; }
      if (!response.ok) throw new Error();
      const payload = await response.json();
      if (payload.workspace?.id) setTargetWorkspaceId(payload.workspace.id);
      const existing = payload.product;
      const destination = onboardingDestination(payload);
      if (destination) { const id = payload.workspace?.id || targetWorkspaceId; window.location.replace(`/app?view=product-intelligence${id ? `&workspaceId=${encodeURIComponent(id)}` : ""}`); return; }
      if (existing) {
        setAnalysisStatus(existing.analysisStatus ?? "idle");
        setProduct({ name: existing.name ?? "", url: existing.url ?? "", description: existing.description ?? "", growthGoal: existing.growthGoal ?? "" });
        setStage(analysisStage(payload.runs?.[0]?.output));
      } else {
        setAnalysisStatus("idle");
      }
    } catch {
      setError(tr("Unable to check your workspace. Please retry.", "无法检查工作台，请重试。"));
    } finally {
      setIsChecking(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { void loadWorkspace(); }, [router]);
  useEffect(() => { window.localStorage.setItem("atlas-locale", locale); }, [locale]);

  useEffect(() => {
    if (!isAnalyzing || (newProductFlow && !targetWorkspaceId)) return;
    const started = Date.now();
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    const poll = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/atlas-v2${targetWorkspaceId ? `?workspaceId=${encodeURIComponent(targetWorkspaceId)}` : ""}`, { cache: "no-store" });
        if (response.status === 401) { router.replace("/login?return_to=/onboarding"); return; }
        if (!response.ok) return;
        const payload = await response.json();
        setStage(analysisStage(payload.runs?.[0]?.output));
        const status = payload.product?.analysisStatus as AnalysisStatus | undefined;
        if (status === "completed") { const id = payload.workspace?.id || targetWorkspaceId; if (id) window.localStorage.setItem("atlas-workspace-id", id); window.location.replace(`/app?view=product-intelligence${id ? `&workspaceId=${encodeURIComponent(id)}` : ""}`); return; }
        if (status === "failed") { setAnalysisStatus("failed"); setError(payload.product?.analysisError || tr("Analysis failed. Please retry.", "分析失败，请重试。")); }
      } catch { /* The original analysis request remains authoritative. */ }
    }, 2500);
    return () => { window.clearInterval(timer); window.clearInterval(poll); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnalyzing, newProductFlow, router, targetWorkspaceId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!onboardingCanSubmit(analysisStatus)) return;
    setAnalysisStatus("running");
    setStage("starting");
    setElapsedSeconds(0);
    setError("");
    let workspaceId = targetWorkspaceId;
    if (newProductFlow && !workspaceId) {
      const createResponse = await fetch("/api/atlas-v2", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_workspace", productName: product.name }) });
      const created = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok || !created.workspaceId) { setAnalysisStatus("failed"); setError(created.error || tr("Unable to create the product workspace.", "无法创建产品工作台。")); return; }
      workspaceId = created.workspaceId;
      setTargetWorkspaceId(workspaceId);
      window.localStorage.setItem("atlas-workspace-id", workspaceId);
      window.history.replaceState(null, "", `/onboarding?new=1&workspaceId=${encodeURIComponent(workspaceId)}`);
    }
    setStage("fetching");
    let response: Response;
    let payload: { error?: string; product?: { analysisStatus?: AnalysisStatus }; workspace?: { id?: string } } = {};
    try {
      response = await fetch(`/api/atlas-v2${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "onboard", product: { ...product, locale } }) });
      payload = await response.json().catch(() => ({}));
    } catch {
      setError(tr("The analysis connection was interrupted. Atlas is still checking its status.", "分析连接已中断，Atlas 仍在检查后台状态。"));
      return;
    }
    if (response.status === 401) {
      router.replace("/login?return_to=/onboarding");
      return;
    }
    if (!response.ok) {
      setAnalysisStatus("failed");
      setError(payload.error || tr("Analysis failed", "分析失败"));
      return;
    }
    if (payload.product?.analysisStatus === "completed") {
      const id = payload.workspace?.id || workspaceId;
      if (id) window.localStorage.setItem("atlas-workspace-id", id);
      window.location.replace(`/app?view=product-intelligence${id ? `&workspaceId=${encodeURIComponent(id)}` : ""}`);
      return;
    }
    setAnalysisStatus(payload.product?.analysisStatus ?? "running");
  }

  return <div className="v2-shell onboarding-workspace" lang={zh ? "zh-CN" : "en"}>
    <aside className="v2-sidebar onboarding-sidebar">
      <div className="v2-brand"><span>▲</span><div><strong>ATLAS</strong><small>LUMEWORD AI WORKSPACE</small></div></div>
      <p>{tr("WORKSPACE", "工作台")}</p>
      <nav aria-label={tr("Workspace navigation", "工作台导航")}>
        <button className="selected" type="button"><i>⌂</i>{tr("Today", "今日")}</button>
        <button type="button" disabled><i>◫</i>{tr("Product Intelligence", "产品洞察")}</button>
        <button type="button" disabled><i>◌</i>{tr("Opportunities", "机会")}</button>
        <button type="button" disabled><i>✓</i>{tr("Approvals", "审批")}</button>
        <button type="button" disabled><i>⌘</i>{tr("Memory", "记忆")}</button>
        <button type="button" disabled><i>↯</i>{tr("Activity", "活动")}</button>
        <button type="button" disabled><i>△</i>{tr("Agents", "智能体")}</button>
        <button type="button" disabled><i>∞</i>{tr("Connections", "连接")}</button>
      </nav>
      <div className="v2-sidebar-foot"><span>{tr("Workspace setup", "正在设置工作台")}</span><div className="language-switch"><button className={zh ? "on" : ""} onClick={() => setLocale("zh")}>中文</button><button className={!zh ? "on" : ""} onClick={() => setLocale("en")}>EN</button></div></div>
    </aside>
    <section className="v2-main">
      <header className="v2-header"><div><small>ATLAS</small><b>/</b><strong>{tr("Product setup", "产品设置")}</strong></div><span className="onboarding-header-status">● {tr("Workspace initialization", "工作台初始化")}</span></header>
      <div className="v2-content onboarding-content">
        <main className="onboarding-card">
          <div className="onboarding-intro"><span className="onboarding-kicker">01 — {tr("GET STARTED", "开始使用")}</span><h1>{tr("Set up your product", "设置你的产品")}</h1><p>{tr("Atlas will fetch the public product page and generate the first product and growth analysis.", "Atlas 将抓取公开产品页面，生成第一份产品与增长分析。")}</p></div>
          <div className="onboarding-form-panel">
            {(isChecking || isAnalyzing) && <AnalysisProgress isChecking={isChecking} stage={stage} elapsedSeconds={elapsedSeconds} zh={zh} />}
            <form onSubmit={submit}><label>{tr("Product name", "产品名称")}<input required disabled={isAnalyzing} value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} placeholder="LumeWord" /></label><label>{tr("Product URL", "产品 URL")}<input required disabled={isAnalyzing} type="url" value={product.url} onChange={(e) => setProduct({ ...product, url: e.target.value })} placeholder="https://atlas.lumeword.com" /></label><label>{tr("Product intro (optional)", "产品简介（可选）")}<textarea disabled={isAnalyzing} value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} /></label><label>{tr("Current growth goal (optional)", "当前增长目标（可选）")}<input disabled={isAnalyzing} value={product.growthGoal} onChange={(e) => setProduct({ ...product, growthGoal: e.target.value })} /></label><button disabled={isChecking || isAnalyzing}>{isAnalyzing ? tr("Analyzing…", "正在分析…") : analysisStatus === "failed" ? tr("Retry analysis", "重新分析") : tr("Start analysis", "开始分析")}</button>{error && <strong className="onboarding-error">{tr("Analysis failed", "分析失败")}: {error}</strong>}</form>
          </div>
        </main>
      </div>
    </section>
  </div>;
}

function AnalysisProgress({ isChecking, stage, elapsedSeconds, zh }: { isChecking: boolean; stage: AnalysisStage; elapsedSeconds: number; zh: boolean }) {
  const tr = (en: string, cn: string) => zh ? cn : en;
  const labels: Record<AnalysisStage, string> = {
    starting: tr("Starting the analysis", "正在启动分析"),
    fetching: tr("Reading the public website", "正在读取公开网站"),
    rendering: tr("Rendering the website content", "正在渲染并提取网站内容"),
    analyzing: tr("AI is analyzing the product", "AI 正在分析产品"),
    saving: tr("Building your Atlas workspace", "正在生成 Atlas 工作台"),
  };
  const percent = isChecking ? 4 : analysisProgress(stage);
  return <div className="onboarding-progress analysis-progress" role="status" aria-live="polite">
    <div className="analysis-progress-head"><strong>{isChecking ? tr("Checking workspace", "正在检查工作台") : labels[stage]}</strong><span>{isChecking ? "" : `${elapsedSeconds}s`}</span></div>
    <div className="analysis-progress-track" aria-label={tr("Analysis progress", "分析进度")}><i style={{ width: `${percent}%` }} /></div>
    <span>{isChecking ? tr("Loading your current Atlas state…", "正在加载当前 Atlas 状态…") : elapsedSeconds > 90 ? tr("This is taking longer than usual. Atlas will make the task retryable if it times out.", "本次分析耗时较长；如果超时，Atlas 会自动恢复为可重试状态。") : tr("This usually takes 30–90 seconds. Please keep this page open.", "通常需要 30–90 秒，请保持页面打开。")}</span>
  </div>;
}
