import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

const allowedEvents = new Set(["page_view", "login_click", "early_access_submit"]);
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  try {
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) return Response.json({ error: "Invalid event origin." }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const eventName = text(body.eventName, 40);
    const anonymousId = text(body.anonymousId, 80);
    if (!allowedEvents.has(eventName) || !anonymousId) return Response.json({ error: "Invalid event." }, { status: 400 });
    await env.DB.prepare("INSERT INTO marketing_events (anonymous_id, event_name, path, referrer, utm_source, utm_medium, utm_campaign, utm_content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(anonymousId, eventName, text(body.path, 500) || "/", text(body.referrer, 500) || null, text(body.utmSource, 120) || null, text(body.utmMedium, 120) || null, text(body.utmCampaign, 160) || null, text(body.utmContent, 160) || null, new Date().toISOString()).run();
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Event was not recorded." }, { status: 400 });
  }
}
