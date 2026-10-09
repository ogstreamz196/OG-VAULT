// Device-local install ledger used for "UPDATE" / "INSTALLED" badges.
import type { AppRow } from "@/lib/catalog";

type Entry = { version: string; build: number; at: number };
const KEY = "ogvault.installed";

function read(): Record<string, Entry> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function recordInstall(app: Pick<AppRow, "id" | "version" | "build_number">) {
  const all = read();
  all[app.id] = { version: app.version, build: app.build_number, at: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export type InstallState = "none" | "installed" | "update";
export function installState(app: Pick<AppRow, "id" | "build_number">, ledger = read()): InstallState {
  const e = ledger[app.id];
  if (!e) return "none";
  return app.build_number > e.build ? "update" : "installed";
}
export const readLedger = read;
