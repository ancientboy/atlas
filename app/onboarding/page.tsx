import { requireChatGPTUser } from "../chatgpt-auth";
import { AtlasOnboarding } from "../../components/atlas-onboarding";

export default async function OnboardingPage() {
  await requireChatGPTUser("/onboarding");
  return <AtlasOnboarding />;
}
