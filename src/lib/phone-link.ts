// Encrypted, expiring "download to my Android phone" links. The token is AES-GCM encrypted and
// authenticated with a server-only secret, so the URL reveals nothing (no app id, no file URL)
// and any edit to it makes it invalid: it can't be changed to reach other apps in the catalogue.
// Web Crypto only, so it runs on the Cloudflare worker.

export type PhoneLinkPayload = { appId: string; userId: string; expiresAt: number };

/** How long a QR code on the TV stays scannable. */
export const PHONE_LINK_TTL_MS = 30 * 60 * 1000;

const enc = new TextEncoder();

// Packed as raw bytes (app id 16 + user id 16 + expiry seconds 4) to keep the URL, and so the QR
// code, as short as possible: a lower-density code scans more easily from across the room.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function uuidBytes(id: string): Uint8Array {
  if (!UUID_RE.test(id)) throw new Error("Expected a UUID");
  return Uint8Array.from(id.replace(/-/g, "").match(/../g)!, (h) => parseInt(h, 16));
}
function bytesUuid(b: Uint8Array): string {
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

async function keyFor(secret: string): Promise<CryptoKey> {
  // Derived with a fixed label so this key is never the same as other uses of the secret.
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`og-vault/phone-download/v1:${secret}`));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  try {
    const s = atob(text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export async function createPhoneLinkToken(payload: PhoneLinkPayload, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = new Uint8Array(36);
  body.set(uuidBytes(payload.appId), 0);
  body.set(uuidBytes(payload.userId), 16);
  new DataView(body.buffer).setUint32(32, Math.floor(payload.expiresAt / 1000)); // whole seconds, rounded down
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFor(secret), body));
  const out = new Uint8Array(iv.length + sealed.length);
  out.set(iv);
  out.set(sealed, iv.length);
  return toBase64Url(out);
}

export type PhoneLinkResult = { ok: true; payload: PhoneLinkPayload } | { ok: false; reason: "invalid" | "expired" };

/** Decrypts and checks a token. Any tampering fails authentication and reads as invalid. */
export async function readPhoneLinkToken(token: string, secret: string, now = Date.now()): Promise<PhoneLinkResult> {
  const bytes = token.length <= 512 ? fromBase64Url(token) : null;
  if (!bytes || bytes.length !== 12 + 36 + 16) return { ok: false, reason: "invalid" };
  try {
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, await keyFor(secret), bytes.slice(12)));
    if (plain.length !== 36) return { ok: false, reason: "invalid" };
    const expiresAt = new DataView(plain.buffer).getUint32(32) * 1000;
    if (expiresAt < now) return { ok: false, reason: "expired" };
    return { ok: true, payload: { appId: bytesUuid(plain.slice(0, 16)), userId: bytesUuid(plain.slice(16, 32)), expiresAt } };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** A filesystem-safe download name, e.g. "Cinema-HD-v2.1.apk". */
export function apkFileName(title: string, version: string): string {
  const base = `${title}-v${version}`.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return `${base || "app"}.apk`;
}
