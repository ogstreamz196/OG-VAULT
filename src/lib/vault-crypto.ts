// Web Crypto helpers (workerd-safe) for the OG Vault webhook and login.
const enc = new TextEncoder();

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string compare. */
export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export const MAX_SKEW_MS = 5 * 60 * 1000;

/** Accepts seconds or milliseconds. */
export function timestampFresh(ts: number, now = Date.now()): boolean {
  if (!Number.isFinite(ts)) return false;
  const ms = ts < 1e12 ? ts * 1000 : ts;
  return Math.abs(now - ms) <= MAX_SKEW_MS;
}

/** Vault usernames become a safe synthetic email local-part. */
export function vaultEmailLocal(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_").slice(0, 60) || "user";
}
