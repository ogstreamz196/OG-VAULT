// Device-local store session (VIP code or playlist login). Not an account.
export type VaultSession =
  | { kind: "vip"; code: string; expiresAt: string | null }
  | { kind: "playlist"; label: string; expiresAt: string | null };

const KEY = "ogvault.session";
const DEVICE = "ogvault.device";

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE, id);
  }
  return id;
}

export function getSession(): VaultSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as VaultSession;
    if (s.expiresAt && new Date(s.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function setSession(s: VaultSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

/** VIP sessions unlock everything; playlist sessions unlock free tier only. */
export function canInstall(session: VaultSession | null, tier: string): boolean {
  if (!session) return false;
  if (tier === "vip") return session.kind === "vip";
  return true;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateVipCode(rand: () => number = Math.random): string {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join("");
  return `OG-${part()}-${part()}`;
}

export const VIP_CODE_PATTERN = /^OG-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
