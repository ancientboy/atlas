"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AtlasOnboarding() {
  const router = useRouter();
  const [locale, setLocale] = useState<"zh" | "en">("zh");
  const [product, setProduct] = useState({ name: "", url: "", description: "", growthGoal: "" });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const zh = locale === "zh";
  const tr = (en: string, cn: string) => zh ? cn : en;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setIsAnalyzing(true);
    setError("");
    const response = await fetch("/api/atlas-v2", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "onboard", product }) });
    const payload = await response.json().catch(() => ({}));
    setIsAnalyzing(false);
    if (response.status === 401) {
      router.replace("/login?return_to=/onboarding");
      return;
    }
    if (!response.ok) {
      setError(payload.error || tr("Analysis failed", "分析失败"));
      return;
    }
    router.replace("/app");
    router.refresh();
  }

  return <div className="v2-shell onboarding-shell" lang={zh ? "zh-CN" : "en"}><main className="onboarding-card"><div className="v2-brand"><span>▲</span><div><strong>ATLAS</strong><small>LUMEWORD AI WORKSPACE</small></div></div><p>{tr("Atlas will fetch the public product page and generate the first product and growth analysis.", "Atlas 将抓取公开产品页面，生成第一份产品与增长分析。")}</p><h1>{tr("Set up your product", "设置你的产品")}</h1><form onSubmit={submit}><label>{tr("Product name", "产品名称")}<input required value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} placeholder="LumeWord" /></label><label>{tr("Product URL", "产品 URL")}<input required type="url" value={product.url} onChange={(e) => setProduct({ ...product, url: e.target.value })} placeholder="https://atlas.lumeword.com" /></label><label>{tr("Product intro (optional)", "产品简介（可选）")}<textarea value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} /></label><label>{tr("Current growth goal (optional)", "当前增长目标（可选）")}<input value={product.growthGoal} onChange={(e) => setProduct({ ...product, growthGoal: e.target.value })} /></label><button disabled={isAnalyzing}>{isAnalyzing ? tr("Analyzing the live website and updating your workspace…", "正在分析真实网页并写入工作台…") : tr("Start analysis", "开始分析")}</button>{error && <strong className="onboarding-error">{tr("Analysis failed", "分析失败")}: {error}</strong>}</form><div className="language-switch"><button className={zh ? "on" : ""} onClick={() => setLocale("zh")}>中文</button><button className={!zh ? "on" : ""} onClick={() => setLocale("en")}>EN</button></div></main></div>;
}
