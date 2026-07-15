export type ProductRouteState = { product?: { analysisStatus?: string } | null };

export function onboardingDestination(state: ProductRouteState): "/app" | null {
  return state.product?.analysisStatus === "completed" ? "/app" : null;
}

export function onboardingCanSubmit(status?: string): boolean {
  return status !== "pending" && status !== "running";
}

export type AnalysisStage = "starting" | "fetching" | "rendering" | "analyzing" | "saving";

export function analysisStage(output?: string): AnalysisStage {
  if (output === "Rendering product website") return "rendering";
  if (output === "Analyzing product with LLM") return "analyzing";
  if (output === "Saving workspace") return "saving";
  if (output === "Fetching public website") return "fetching";
  return "starting";
}

export function analysisProgress(stage: AnalysisStage): number {
  return { starting: 8, fetching: 22, rendering: 42, analyzing: 70, saving: 92 }[stage];
}

export function workspaceDestination(state: ProductRouteState): "/onboarding" | null {
  return state.product?.analysisStatus === "completed" ? null : "/onboarding";
}

export function workspaceErrorMessage(locale: "zh" | "en") {
  return locale === "zh"
    ? "无法加载工作台。Atlas 没有执行任何外部操作，请重试。"
    : "Unable to load the workspace. Atlas did not run any external action. Please retry.";
}
