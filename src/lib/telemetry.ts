// Fire-and-forget install telemetry. Never throws, never blocks a download.
import { supabase } from "@/integrations/supabase/client";
import { isNative } from "@/lib/native-install";

export type InstallEvent = "download_started" | "download_completed" | "download_failed" | "install_prompted" | "install_failed";

export function logInstallEvent(appId: string, userId: string | undefined, event: InstallEvent, error?: string) {
  if (!userId) return;
  void supabase
    .from("app_install_events")
    .insert({ app_id: appId, user_id: userId, event_type: event, platform: isNative() ? "firestick" : "web", error_message: error?.slice(0, 500) ?? null })
    .then(({ error: e }) => { if (e) console.warn("telemetry", e.message); }, () => {});
}

export type EventRow = { app_id: string; event_type: string; created_at: string; error_message: string | null; platform?: string };

export type AppStats = { appId: string; downloads: number; completed: number; installs: number; failures: number; failureRate: number; lastError: string | null };

/** Per-app aggregation. Failure rate = failures / download attempts. */
export function aggregate(rows: EventRow[]): AppStats[] {
  const m = new Map<string, AppStats>();
  for (const r of rows) {
    const s = m.get(r.app_id) ?? { appId: r.app_id, downloads: 0, completed: 0, installs: 0, failures: 0, failureRate: 0, lastError: null };
    if (r.event_type === "download_started") s.downloads++;
    else if (r.event_type === "download_completed") s.completed++;
    else if (r.event_type === "install_prompted") s.installs++;
    else if (r.event_type.endsWith("_failed")) { s.failures++; s.lastError ??= r.error_message; }
    m.set(r.app_id, s);
  }
  for (const s of m.values()) s.failureRate = s.downloads ? s.failures / s.downloads : 0;
  return [...m.values()].sort((a, b) => b.downloads - a.downloads);
}
