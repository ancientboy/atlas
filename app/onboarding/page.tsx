import { requireChatGPTUser } from "../chatgpt-auth";
import { AtlasOnboarding } from "../../components/atlas-onboarding";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ new?: string; workspaceId?: string }> }) {
  const params = await searchParams;
  const newProduct = params.new === "1";
  const initialWorkspaceId = params.workspaceId || "";
  const returnTo = `/onboarding${newProduct ? "?new=1" : initialWorkspaceId ? `?workspaceId=${encodeURIComponent(initialWorkspaceId)}` : ""}`;
  await requireChatGPTUser(returnTo);
  return <AtlasOnboarding newProduct={newProduct} initialWorkspaceId={initialWorkspaceId} />;
}
