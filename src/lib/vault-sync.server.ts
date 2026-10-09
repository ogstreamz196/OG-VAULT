import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const OG_BOT_BASE = "https://07659a42-5b68-4c8b-83b5-ee9a625dbb92.lovableproject.com/api/public/v1/vault";
const TIMEOUT_MS = 6000;

export function maskKey(key: string | null | undefined) {
  if (!key) return null;
  const tail = key.slice(-4);
  const head = key.startsWith("ogv_") ? "ogv_" : "";
  return `${head}••••••••${tail}`;
}

export async function getSettings() {
  const { data } = await supabaseAdmin.from("vault_sync_settings").select("*").eq("id", 1).maybeSingle();
  return data;
}

async function saveError(msg: string) {
  console.error("[og-vault-sync]", msg);
  await supabaseAdmin.from("vault_sync_settings").update({ status: "error", last_error: msg, last_error_at: new Date().toISOString() }).eq("id", 1);
}

async function call(path: string, key: string, init?: RequestInit) {
  return fetch(`${OG_BOT_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export async function pingVault(): Promise<{ ok: boolean; message: string }> {
  const s = await getSettings();
  if (!s?.api_key) return { ok: false, message: "No API key saved" };
  try {
    const r = await call("/ping", s.api_key);
    if (r.status === 401) { await saveError("Invalid or revoked API key"); return { ok: false, message: "Invalid or revoked API key" }; }
    const j = (await r.json().catch(() => null)) as { ok?: boolean; key_name?: string; active_credentials?: number } | null;
    if (!r.ok || !j?.ok) { const m = `Ping failed (HTTP ${r.status})`; await saveError(m); return { ok: false, message: m }; }
    await supabaseAdmin.from("vault_sync_settings").update({ status: "connected", key_name: j.key_name ?? null, active_count: j.active_credentials ?? null, last_error: null }).eq("id", 1);
    return { ok: true, message: `Connected to OG BOT Vault (${j.active_credentials ?? 0} active logins)` };
  } catch (e) {
    const m = e instanceof Error && e.name === "TimeoutError" ? "OG BOT Vault timed out" : "Could not reach OG BOT Vault";
    await saveError(m);
    return { ok: false, message: m };
  }
}

type Cred = { username: string; password: string; note?: string | null; active?: boolean };

/** Pull all credentials; never throws. Skips silently when disabled or no key. */
export async function syncVault(): Promise<{ ok: boolean; message: string; count?: number }> {
  const s = await getSettings();
  if (!s?.enabled || !s.api_key) return { ok: false, message: "Sync is off or no key saved" };
  try {
    const r = await call("/credentials", s.api_key);
    if (r.status === 401) { await saveError("Invalid or revoked API key"); return { ok: false, message: "Invalid or revoked API key" }; }
    const j = (await r.json().catch(() => null)) as { ok?: boolean; credentials?: Cred[] } | null;
    if (!r.ok || !j?.ok || !Array.isArray(j.credentials)) { const m = `Sync failed (HTTP ${r.status})`; await saveError(m); return { ok: false, message: m }; }

    const now = new Date().toISOString();
    const { data: existing } = await supabaseAdmin.from("vault_credentials").select("id,username");
    const byLower = new Map((existing ?? []).map((e) => [e.username.toLowerCase(), e.id]));
    const seen = new Set<string>();
    for (const c of j.credentials) {
      const username = String(c.username ?? "").trim();
      if (!username || seen.has(username.toLowerCase())) continue;
      seen.add(username.toLowerCase());
      const row = { username, password: String(c.password ?? ""), note: c.note ?? "", active: c.active !== false, synced_at: now, updated_at: now };
      const id = byLower.get(username.toLowerCase());
      if (id) await supabaseAdmin.from("vault_credentials").update(row).eq("id", id);
      else await supabaseAdmin.from("vault_credentials").insert(row);
    }
    const missing = (existing ?? []).filter((e) => !seen.has(e.username.toLowerCase())).map((e) => e.id);
    if (missing.length) await supabaseAdmin.from("vault_credentials").update({ active: false, synced_at: now }).in("id", missing);

    const active = j.credentials.filter((c) => c.active !== false).length;
    await supabaseAdmin.from("vault_sync_settings").update({ status: "connected", last_synced_at: now, last_error: null, active_count: active }).eq("id", 1);
    return { ok: true, message: `Synced ${seen.size} logins`, count: seen.size };
  } catch (e) {
    const m = e instanceof Error && e.name === "TimeoutError" ? "OG BOT Vault timed out" : "Could not reach OG BOT Vault";
    await saveError(m);
    return { ok: false, message: m };
  }
}

/** Live check; returns null when unavailable (caller falls back to synced rows). */
export async function verifyLive(username: string, pin: string): Promise<boolean | null> {
  const s = await getSettings();
  if (!s?.enabled || !s.api_key) return null;
  try {
    const r = await call("/verify", s.api_key, { method: "POST", body: JSON.stringify({ username, pin }) });
    if (!r.ok) return null;
    const j = (await r.json().catch(() => null)) as { ok?: boolean; valid?: boolean } | null;
    return j?.ok ? !!j.valid : null;
  } catch (e) {
    console.error("[og-vault-sync] verify failed", e);
    return null;
  }
}
