import { useState } from "react";
import { Zap } from "lucide-react";
import { downloadAndInstallApk } from "@/lib/native-install";
import type { StoreRelease } from "@/lib/store-release";

// The Update button stays focusable while downloading (clicks are ignored) so the remote's
// focus doesn't jump to Later mid-download.
/** TV-friendly prompt to download the new 0G VAULT APK and hand it to the Android installer. */
export function SelfUpdateModal({ release, onClose }: { release: StoreRelease; onClose: () => void }) {
  const [pct, setPct] = useState<number | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const busy = pct !== null && pct < 100 && !status;
  const mandatory = release.is_mandatory;

  async function update() {
    if (!release.apk_url || busy) return;
    setStatus(null);
    setPct(0);
    try {
      const r = await downloadAndInstallApk(release.apk_url, "0G_VAULT_Update.apk", setPct);
      setPct(100);
      setStatus({ tone: "ok", text: r === "installed" ? "Installer opened — choose Update on screen to finish." : "Download complete." });
    } catch (e) {
      setPct(null);
      setStatus({ tone: "error", text: e instanceof Error ? e.message : "Download failed, try again" });
    }
  }

  return (
    <div data-nav-scope className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/95 p-4 sm:items-center sm:p-10">
      <div className="glass relative w-full max-w-2xl overflow-hidden rounded-3xl border-glow/50 p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-40 blur-3xl" style={{ background: "var(--glow)" }} />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-glow/20"><Zap className="h-6 w-6 text-glow" /></span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-glow">0G VAULT update</p>
            <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">A new version of 0G VAULT is ready to install</h2>
          </div>
        </div>
        <p className="relative mt-4 text-lg font-bold">
          Version {release.version} <span className="font-semibold text-muted-foreground">· build {release.build_number}</span>
          {mandatory && <span className="ml-2 rounded-md bg-vip px-2 py-0.5 align-middle text-xs font-bold uppercase text-primary-foreground">Required</span>}
        </p>
        {release.changelog.trim() && (
          <div className="relative mt-3 max-h-[28vh] overflow-y-auto whitespace-pre-line rounded-xl bg-card/70 p-4 text-base leading-relaxed text-muted-foreground">
            {release.changelog.replace(/\\n/g, "\n")}
          </div>
        )}

        {pct !== null && (
          <div className="relative mt-5" aria-live="polite">
            <div className="mb-1.5 flex justify-between text-sm font-semibold"><span>{pct < 100 ? "Downloading update…" : "Download complete"}</span><span className="text-glow">{pct}%</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-glow transition-[width] duration-300" style={{ width: `${pct}%`, boxShadow: "0 0 12px var(--glow)" }} />
            </div>
          </div>
        )}
        {status && <p role={status.tone === "error" ? "alert" : "status"} className={`relative mt-4 text-base font-semibold ${status.tone === "error" ? "text-vip" : "text-glow"}`}>{status.text}</p>}

        <div className="relative mt-6 flex flex-wrap gap-3">
          <button data-nav data-nav-autofocus onClick={update} aria-disabled={busy} className={`tv-focus flex-1 rounded-xl bg-primary px-6 py-4 text-lg font-bold text-primary-foreground ${busy ? "opacity-70" : "update-glow"}`}>
            {busy ? `Downloading ${pct}%` : status?.tone === "error" ? "Try again" : status ? "Install again" : "Update Now"}
          </button>
          {!mandatory && (
            <button data-nav data-nav-dismiss onClick={onClose} className="tv-focus rounded-xl bg-secondary px-6 py-4 text-lg font-semibold">Later</button>
          )}
        </div>
        {mandatory && <p className="relative mt-3 text-sm text-muted-foreground">This update is required to keep using the store.</p>}
      </div>
    </div>
  );
}
