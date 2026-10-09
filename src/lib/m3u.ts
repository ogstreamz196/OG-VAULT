// Pure helpers for playlist login validation (shared by server function + tests).
export type PlaylistInput =
  | { mode: "xtream"; server: string; username: string; password: string }
  | { mode: "m3u"; url: string };

export type M3uRules = {
  enabled: boolean;
  require_active_status: boolean;
  reject_expired: boolean;
  allowed_hosts: string[];
  min_connections: number;
  timeout_ms: number;
};

export function normalizeServer(server: string): string {
  let s = server.trim();
  if (!/^https?:\/\//i.test(s)) s = "http://" + s;
  return s.replace(/\/+$/, "");
}

/** Turn an Xtream-style get.php M3U link into xtream credentials when possible. */
export function toXtream(input: PlaylistInput): { server: string; username: string; password: string } | null {
  if (input.mode === "xtream") return { server: normalizeServer(input.server), username: input.username.trim(), password: input.password };
  try {
    const u = new URL(input.url.trim());
    const username = u.searchParams.get("username");
    const password = u.searchParams.get("password");
    if (username && password) return { server: u.origin, username, password };
  } catch {
    return null;
  }
  return null;
}

export function hostAllowed(url: string, allowed: string[]): boolean {
  if (!allowed.length) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return allowed.some((h) => {
      const a = h.trim().toLowerCase();
      return a && (host === a || host.endsWith("." + a));
    });
  } catch {
    return false;
  }
}

export type XtreamUserInfo = { auth?: number | string; status?: string; exp_date?: string | null; max_connections?: string | number };

export function evaluateXtream(info: XtreamUserInfo | undefined, rules: M3uRules, nowSec = Date.now() / 1000): { ok: true; expiresAt: string | null } | { ok: false; error: string } {
  if (!info || Number(info.auth) !== 1) return { ok: false, error: "Login rejected by provider" };
  if (rules.require_active_status && info.status && info.status.toLowerCase() !== "active") return { ok: false, error: `Account status: ${info.status}` };
  const exp = info.exp_date ? Number(info.exp_date) : null;
  if (rules.reject_expired && exp && exp < nowSec) return { ok: false, error: "Subscription expired" };
  if (rules.min_connections > 0 && Number(info.max_connections ?? 0) < rules.min_connections) return { ok: false, error: "Not enough connections on this account" };
  return { ok: true, expiresAt: exp ? new Date(exp * 1000).toISOString() : null };
}
