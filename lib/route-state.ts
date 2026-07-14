export type ProductRouteState = { product?: { analysisStatus?: string } | null };

export function onboardingDestination(state: ProductRouteState): "/app" | null {
  return state.product?.analysisStatus === "completed" ? "/app" : null;
}

export function onboardingCanSubmit(status?: string): boolean {
  return status !== "pending" && status !== "running";
}

export function workspaceDestination(state: ProductRouteState): "/onboarding" | null {
  return state.product?.analysisStatus === "completed" ? null : "/onboarding";
}

export function workspaceErrorMessage(locale: "zh" | "en") {
  return locale === "zh"
    ? "无法加载工作台。Atlas 没有执行任何外部操作，请重试。"
    : "Unable to load the workspace. Atlas did not run any external action. Please retry.";
}
