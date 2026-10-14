// Streaming account sign-in check — authentication only, nothing else from the account is stored.
const HOST = "http://xiu96ctyh6-system.xyz";

export type AccountResult = "active" | "expired" | "invalid" | "unreachable";

export async function checkStreamAccount(username: string, password: string): Promise<AccountResult> {
  const url = `${HOST}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return res.status >= 500 && res.status !== 512 && res.status < 600 ? "unreachable" : "invalid";
    const j = (await res.json().catch(() => null)) as { user_info?: { auth?: number | string; status?: string; exp_date?: string | null } } | null;
    const u = j?.user_info;
    if (!u || Number(u.auth) !== 1) return "invalid";
    const exp = u.exp_date ? Number(u.exp_date) * 1000 : 0;
    if ((u.status ?? "").toLowerCase() === "expired" || (exp > 0 && exp < Date.now())) return "expired";
    if ((u.status ?? "").toLowerCase() !== "active") return "invalid";
    return "active";
  } catch {
    return "unreachable";
  }
}
