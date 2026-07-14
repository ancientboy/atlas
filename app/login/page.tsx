import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const params = await searchParams;
  const returnTo = params.return_to || "/app";
  const user = await getChatGPTUser();
  redirect(user ? "/app" : chatGPTSignInPath(returnTo));
}
