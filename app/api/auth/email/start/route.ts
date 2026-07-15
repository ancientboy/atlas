import { env } from "cloudflare:workers";
import { appOrigin, createAuthChallenge } from "../../../../../lib/atlas-auth";
import { safeRelativeReturnPath } from "../../../../../lib/auth-paths";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { email?: string; returnTo?: string };
  const email = body.email?.trim().toLowerCase() || "";
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return Response.json({ error: "A valid email address is required." }, { status: 400 });
  const recent = await env.DB.prepare("SELECT COUNT(*) AS count FROM atlas_auth_challenges WHERE kind = 'email' AND email = ? AND datetime(created_at) > datetime('now', '-10 minutes')").bind(email).first<{ count: number }>();
  if ((recent?.count ?? 0) >= 3) return Response.json({ ok: true });
  const token = await createAuthChallenge(env.DB, "email", safeRelativeReturnPath(body.returnTo || "/app"), email);
  const origin = appOrigin(request, env.ATLAS_APP_URL);
  const magicLink = `${origin}/api/auth/email/verify?token=${encodeURIComponent(token)}`;
  if (!env.RESEND_API_KEY || !env.AUTH_EMAIL_FROM) return Response.json({ error: "Email sign-in is not configured yet." }, { status: 503 });
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ from: env.AUTH_EMAIL_FROM, to: [email], subject: "Sign in to LumeWord Atlas", text: `Sign in to Atlas: ${magicLink}\n\nThis link expires in 15 minutes. If you did not request it, ignore this email.`, html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px"><h1 style="font-size:24px">Sign in to Atlas</h1><p>Continue to your LumeWord Atlas workspace.</p><p><a href="${magicLink}" style="display:inline-block;background:#183029;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Sign in to Atlas</a></p><p style="color:#6b7772;font-size:13px">This link expires in 15 minutes. If you did not request it, ignore this email.</p></div>` }) });
  if (!response.ok) return Response.json({ error: "Email could not be sent. Please try again later." }, { status: 502 });
  return Response.json({ ok: true });
}
