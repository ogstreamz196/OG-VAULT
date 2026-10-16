// Boss-triggered "Force purge & refresh": wipes stale web caches on every device without signing
// anyone out. Devices compare store_release.purge_token with the last token they acted on.
import type { QueryClient } from "@tanstack/react-query";
import { clearNativeWebCache } from "@/lib/adb-bridge";

export const PURGE_TOKEN_KEY = "og_last_purged_token";

/**
 * localStorage keys that survive a purge: the sign-in session (Supabase stores it under
 * sb-<project>-auth-token), the device's install ledger, the saved Firestick IP and the purge
 * marker itself. Everything else is cleared.
 */
export function isPreservedKey(key: string): boolean {
  return key.startsWith("sb-") || key === "ogvault.installed" || key === "ogvault.adbHost" || key === PURGE_TOKEN_KEY;
}

/**
 * Purge only for a token this device hasn't handled yet. A device with no record is brand new
 * (or only just received this code), so it is already running fresh files: it adopts the
 * current token instead of reloading for nothing.
 */
export function purgeDecision(token: string | null | undefined, lastHandled: string | null): "purge" | "adopt" | "none" {
  if (!token || token === lastHandled) return "none";
  return lastHandled === null ? "adopt" : "purge";
}

export function rememberPurgeToken(token: string) {
  try { localStorage.setItem(PURGE_TOKEN_KEY, token); } catch { /* storage blocked */ }
}

export function lastPurgedToken(): string | null {
  try { return localStorage.getItem(PURGE_TOKEN_KEY); } catch { return null; }
}

/**
 * Clears CacheStorage, service workers, sessionStorage, the query cache, non-essential
 * localStorage and (on the APK) the WebView's HTTP cache, then reloads with a cache-busting URL.
 * Returns false without reloading if the device can't remember the token, so it never loops.
 */
export async function executeClientPurge(newToken: string, queryClient?: QueryClient): Promise<boolean> {
  // Record the token first and read it back: if storage is blocked we'd purge on every load.
  try {
    localStorage.setItem(PURGE_TOKEN_KEY, newToken);
    if (localStorage.getItem(PURGE_TOKEN_KEY) !== newToken) return false;
  } catch {
    return false;
  }

  // 1. Keep the sign-in session and device records; drop every other localStorage entry.
  try {
    const keep = new Map<string, string>();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && isPreservedKey(k)) keep.set(k, localStorage.getItem(k) ?? "");
    }
    localStorage.clear();
    keep.forEach((v, k) => localStorage.setItem(k, v));
  } catch { /* keep going: caches matter most */ }

  // 2. CacheStorage and 3. service workers.
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* not available */ }
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch { /* not available */ }

  // 4. Session storage, in-memory queries and the native WebView HTTP cache.
  try { sessionStorage.clear(); } catch { /* blocked */ }
  queryClient?.clear();
  await clearNativeWebCache();

  // 5. Fresh load of the page; the timestamp bypasses any cached copy of the HTML.
  const url = new URL(window.location.href);
  url.searchParams.set("_cb", String(Date.now()));
  window.location.replace(url.toString());
  return true;
}
