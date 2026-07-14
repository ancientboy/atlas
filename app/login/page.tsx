import { chatGPTSignInPath } from "../chatgpt-auth";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const params = await searchParams;
  redirect(chatGPTSignInPath(params.return_to || "/app"));
}
