// Store access rules: username accounts, VIP membership, VIP-only categories.
export const USERNAME_DOMAIN = "users.ogvault.app";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function usernameError(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (u.length < 3 || u.length > 20) return "Username must be 3–20 characters";
  if (!/^[a-z0-9_.-]+$/.test(u)) return "Use letters, numbers, dot, dash or underscore only";
  return null;
}

/** Usernames sign in through a synthetic, never-emailed address. */
export function usernameToEmail(raw: string): string {
  return `${normalizeUsername(raw)}@${USERNAME_DOMAIN}`;
}

export type Level = "none" | "guest" | "free" | "vip" | "admin";
export const AUDIENCES = ["guest", "free", "vip"] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Guest = D.EV MODE Google sign-in, Free = username account, VIP = VIP member. The boss sees and installs everything. */
export function canSeeApp(level: Level, audiences: string[]): boolean {
  if (level === "admin") return true;
  if (level === "none") return false;
  return audiences.includes(level);
}

/** Badge shown on an app: VIP when only VIP users can see it. */
export function tierFromAudiences(audiences: string[]): "vip" | "free" {
  return audiences.length > 0 && audiences.every((a) => a === "vip") ? "vip" : "free";
}

/** A VIP category is locked for anyone without VIP; other categories are always open. */
export function isCategoryLocked(category: { is_vip: boolean }, isVip: boolean): boolean {
  return category.is_vip && !isVip;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateVipCode(rand: () => number = Math.random): string {
  const part = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(rand() * ALPHABET.length)]).join("");
  return `OG-${part()}-${part()}`;
}
export const VIP_CODE_PATTERN = /^OG-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export const BOSS_EMAIL = "ogstreamz196@gmail.com";

/** VIP-only apps show in the dedicated VIP category and in the category picked at upload. */
export function appsForCategory<T extends { category_id: string | null; audiences: string[] }>(apps: T[], category: { id: string; is_vip: boolean }): T[] {
  return apps.filter((a) => a.category_id === category.id || (category.is_vip && tierFromAudiences(a.audiences) === "vip"));
}
