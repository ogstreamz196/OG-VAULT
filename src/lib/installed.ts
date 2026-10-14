// Install state for "UPDATE" / "INSTALLED" badges. On the APK the device's real installed
// version (PackageManager versionCode) decides; in the browser a device-local ledger does.
import type { AppRow } from "@/lib/catalog";
import type { PackageVersion } from "@/lib/adb-bridge";

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
export function installState(app: Pick<AppRow, "id" | "build_number">, ledger = read(), device?: PackageVersion | null): InstallState {
  if (device) return !device.installed ? "none" : app.build_number > device.versionCode ? "update" : "installed";
  const e = ledger[app.id];
  if (!e) return "none";
  return app.build_number > e.build ? "update" : "installed";
}
export const readLedger = read;
