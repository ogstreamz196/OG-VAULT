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

/** VIP members (and the boss) can install everything; members can install free apps. */
export function canInstall(signedIn: boolean, isVip: boolean, tier: string): boolean {
  if (!signedIn) return false;
  return tier === "vip" ? isVip : true;
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
