"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Locale = "zh" | "en";
type AccountData = {
  profile: { displayName: string; email: string; locale: Locale };
  identities: { provider: string; email: string; createdAt: string }[];
  activeSessions: number;
  workspaces: { id: string; name: string; role: string }[];
};

const providerNames: Record<string, string> = { email: "Email", google: "Google", chatgpt: "ChatGPT", sites: "ChatGPT" };

export function AccountMenu({ initialName, email, locale, onLocaleChange }: { initialName: string; email: string; locale: Locale; onLocaleChange: (locale: Locale) => void }) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [displayName, setDisplayName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const zh = locale === "zh";
  const name = account?.profile.displayName || displayName || email;
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || email[0]?.toUpperCase() || "A";

  useEffect(() => {
    function close(event: MouseEvent) { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function loadAccount() {
    const response = await fetch("/api/account", { cache: "no-store" });
    if (response.status === 401) { window.location.assign("/login?return_to=/app"); return; }
    if (!response.ok) { setMessage(zh ? "无法加载账户信息。" : "Unable to load account information."); return; }
    const payload = await response.json() as AccountData;
    setAccount(payload); setDisplayName(payload.profile.displayName); onLocaleChange(payload.profile.locale);
  }

  async function openSettings() { setOpen(false); setSettingsOpen(true); setMessage(""); await loadAccount(); }

  async function saveProfile() {
    setSaving(true); setMessage("");
    const response = await fetch("/api/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ displayName, locale }) });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) { setMessage(payload.error || (zh ? "保存失败。" : "Save failed.")); return; }
    setAccount((current) => current ? { ...current, profile: payload.profile } : current);
    setMessage(zh ? "账户资料已更新。" : "Account updated.");
  }

  async function revokeOtherSessions() {
    setSaving(true);
    const response = await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "revoke_other_sessions" }) });
    setSaving(false);
    if (!response.ok) { setMessage(zh ? "无法退出其他设备。" : "Unable to sign out other devices."); return; }
    setAccount((current) => current ? { ...current, activeSessions: 1 } : current);
    setMessage(zh ? "其他设备上的 Atlas 会话已退出。" : "Other Atlas sessions have been signed out.");
  }

  return <>
    <div className="account-menu" ref={root}>
      {open && <div className="account-popover">
        <div className="account-popover-head"><span className="account-avatar">{initials}</span><div><strong>{name}</strong><small>{email}</small></div></div>
        <button onClick={() => void openSettings()}><span>⚙</span>{zh ? "账户设置" : "Account settings"}</button>
        <button onClick={() => void openSettings()}><span>⌁</span>{zh ? "登录方式与安全" : "Sign-in & security"}</button>
        <form action="/api/auth/logout" method="post"><button className="account-signout"><span>↪</span>{zh ? "退出登录" : "Sign out"}</button></form>
      </div>}
      <button className="account-trigger" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="account-avatar">{initials}</span><span><strong>{name}</strong><small>{email}</small></span><b>⌃</b>
      </button>
    </div>
    {settingsOpen && typeof document !== "undefined" && createPortal(<div className="account-modal-backdrop" onMouseDown={() => setSettingsOpen(false)}><section className="account-modal" onMouseDown={(event) => event.stopPropagation()}>
      <button className="account-modal-close" onClick={() => setSettingsOpen(false)}>×</button>
      <header><span className="account-avatar account-avatar-large">{initials}</span><div><p>{zh ? "ATLAS 账户" : "ATLAS ACCOUNT"}</p><h2>{zh ? "账户设置" : "Account settings"}</h2><small>{email}</small></div></header>
      {!account ? <div className="account-loading">{message || (zh ? "正在加载…" : "Loading…")}</div> : <>
        <div className="account-section"><h3>{zh ? "个人资料" : "Profile"}</h3><label>{zh ? "显示名称" : "Display name"}<input value={displayName} maxLength={120} onChange={(event) => setDisplayName(event.target.value)} /></label><div className="account-language"><span>{zh ? "界面语言" : "Interface language"}</span><button className={locale === "zh" ? "on" : ""} onClick={() => onLocaleChange("zh")}>中文</button><button className={locale === "en" ? "on" : ""} onClick={() => onLocaleChange("en")}>EN</button></div><button className="account-primary" disabled={saving || !displayName.trim()} onClick={() => void saveProfile()}>{saving ? "…" : zh ? "保存更改" : "Save changes"}</button></div>
        <div className="account-section"><h3>{zh ? "登录方式" : "Sign-in methods"}</h3><p>{zh ? "相同邮箱的登录方式会自动进入同一个 Atlas 账户。" : "Sign-in methods with the same verified email open this Atlas account."}</p><div className="identity-list">{account.identities.map((identity) => <div key={`${identity.provider}-${identity.email}`}><b>{providerNames[identity.provider] || identity.provider}</b><span>{identity.email}</span><strong>{zh ? "已连接" : "Connected"}</strong></div>)}</div><div className="identity-actions"><a href="/api/auth/google/start?return_to=/app">＋ Google</a><a href="/signin-with-chatgpt?return_to=%2Fapp">＋ ChatGPT</a></div></div>
        <div className="account-section"><h3>{zh ? "安全与工作区" : "Security & workspaces"}</h3><p>{zh ? `当前有 ${account.activeSessions} 个活跃会话，加入了 ${account.workspaces.length} 个工作区。` : `${account.activeSessions} active sessions across ${account.workspaces.length} workspaces.`}</p><button className="account-secondary" disabled={saving || account.activeSessions <= 1} onClick={() => void revokeOtherSessions()}>{zh ? "退出其他设备" : "Sign out other devices"}</button></div>
      </>}
      {message && <div className="account-message" role="status">{message}</div>}
    </section></div>, document.body)}
  </>;
}
