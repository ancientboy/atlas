"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onboardingCanSubmit, onboardingDestination } from "../lib/route-state";

type AnalysisStatus = "idle" | "pending" | "running" | "completed" | "failed";

export function AtlasOnboarding() {
  const router = useRouter();
  const [locale, setLocale] = useState<"zh" | "en">("zh");
  const [product, setProduct] = useState({ name: "", url: "", description: "", growthGoal: "" });
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState("");
  const zh = locale === "zh";
  const tr = (en: string, cn: string) => zh ? cn : en;
  const isAnalyzing = analysisStatus === "pending" || analysisStatus === "running";

  async function loadWorkspace() {
    setIsChecking(true);
    setError("");
    try {
      const response = await fetch("/api/atlas-v2");
      if (response.status === 401) { router.replace("/login?return_to=/onboarding"); return; }
      if (!response.ok) throw new Error();
      const payload = await response.json();
      const existing = payload.product;
      const destination = onboardingDestination(payload);
      if (destination) { router.replace(destination); return; }
      if (existing) {
        setAnalysisStatus(existing.analysisStatus ?? "idle");
        setProduct({ name: existing.name ?? "", url: existing.url ?? "", description: existing.description ?? "", growthGoal: existing.growthGoal ?? "" });
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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!onboardingCanSubmit(analysisStatus)) return;
    setAnalysisStatus("running");
    setError("");
    const response = await fetch("/api/atlas-v2", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "onboard", product }) });
    const payload = await response.json().catch(() => ({}));
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
      router.replace("/app");
      router.refresh();
      return;
    }
    setAnalysisStatus(payload.product?.analysisStatus ?? "running");
  }

  return <div className="v2-shell onboarding-shell" lang={zh ? "zh-CN" : "en"}><main className="onboarding-card"><div className="v2-brand"><span>▲</span><div><strong>ATLAS</strong><small>LUMEWORD AI WORKSPACE</small></div></div><p>{tr("Atlas will fetch the public product page and generate the first product and growth analysis.", "Atlas 将抓取公开产品页面，生成第一份产品与增长分析。")}</p><h1>{tr("Set up your product", "设置你的产品")}</h1>{(isChecking || isAnalyzing) && <div className="onboarding-progress" role="status"><strong>{isChecking ? tr("Checking workspace", "正在检查工作台") : tr("Analysis in progress", "正在分析产品")}</strong><span>{tr("Atlas is preparing your workspace. You cannot submit another product until this finishes.", "Atlas 正在准备工作台。完成前不能重复提交产品。")}</span></div>}<form onSubmit={submit}><label>{tr("Product name", "产品名称")}<input required disabled={isAnalyzing} value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} placeholder="LumeWord" /></label><label>{tr("Product URL", "产品 URL")}<input required disabled={isAnalyzing} type="url" value={product.url} onChange={(e) => setProduct({ ...product, url: e.target.value })} placeholder="https://atlas.lumeword.com" /></label><label>{tr("Product intro (optional)", "产品简介（可选）")}<textarea disabled={isAnalyzing} value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} /></label><label>{tr("Current growth goal (optional)", "当前增长目标（可选）")}<input disabled={isAnalyzing} value={product.growthGoal} onChange={(e) => setProduct({ ...product, growthGoal: e.target.value })} /></label><button disabled={isChecking || isAnalyzing}>{isAnalyzing ? tr("Analyzing…", "正在分析…") : analysisStatus === "failed" ? tr("Retry analysis", "重新分析") : tr("Start analysis", "开始分析")}</button>{error && <strong className="onboarding-error">{tr("Analysis failed", "分析失败")}: {error}</strong>}</form><div className="language-switch"><button className={zh ? "on" : ""} onClick={() => setLocale("zh")}>中文</button><button className={!zh ? "on" : ""} onClick={() => setLocale("en")}>EN</button></div></main></div>;
}
