import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { storeReleaseQuery } from "@/lib/store-release";
import { executeClientPurge, lastPurgedToken, purgeDecision, rememberPurgeToken } from "@/lib/cache-purge";

/** Runs on every screen: when the boss publishes a new purge token, refresh this device cleanly. */
export function PurgeWatcher() {
  const qc = useQueryClient();
  const { data: release } = useQuery(storeReleaseQuery);
  const [purging, setPurging] = useState(false);
  const started = useRef(false);

  // Tidy the cache-busting marker from the address after a purge reload.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("_cb")) return;
    url.searchParams.delete("_cb");
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);

  useEffect(() => {
    const token = release?.purge_token;
    if (started.current || !token) return;
    const decision = purgeDecision(token, lastPurgedToken());
    if (decision === "adopt") rememberPurgeToken(token);
    if (decision !== "purge") return;
    started.current = true;
    setPurging(true);
    // Give the message a moment on screen, then wipe and reload.
    const t = setTimeout(() => {
      void executeClientPurge(token, qc).then((reloading) => { if (!reloading) setPurging(false); });
    }, 900);
    return () => clearTimeout(t);
  }, [release?.purge_token, qc]);

  if (!purging) return null;
  return (
    <div role="status" aria-live="assertive" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background/95 text-center">
      <span className="h-12 w-12 animate-spin rounded-full border-4 border-glow/30 border-t-glow" />
      <p className="text-2xl font-bold">Updating 0G VAULT with fresh assets…</p>
      <p className="text-muted-foreground">You'll stay signed in.</p>
    </div>
  );
}
