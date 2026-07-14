import { requireChatGPTUser } from "../chatgpt-auth";
import { AtlasDashboard } from "../../components/atlas-dashboard";

export default async function AppPage() {
  const user = await requireChatGPTUser("/app");
  return <AtlasDashboard user={user} />;
}
