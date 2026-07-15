import { redirect } from "next/navigation";
import { getChatGPTUser } from "../chatgpt-auth";
import { safeRelativeReturnPath } from "../../lib/auth-paths";
import { AtlasLogin } from "../../components/atlas-login";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string; error?: string }> }) {
  const params = await searchParams;
  const user = await getChatGPTUser();
  if (user) redirect(safeRelativeReturnPath(params.return_to || "/app"));
  return <AtlasLogin returnTo={safeRelativeReturnPath(params.return_to || "/app")} initialError={params.error || ""} />;
}
