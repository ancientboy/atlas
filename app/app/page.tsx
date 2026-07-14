import { requireChatGPTUser } from "../chatgpt-auth";
import { AtlasDashboard } from "../../components/atlas-dashboard";

export default async function AppPage() {
  await requireChatGPTUser("/app");
  return <AtlasDashboard />;
}
