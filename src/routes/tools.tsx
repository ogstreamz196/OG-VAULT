import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoreGate } from "@/components/tv/StoreGate";
import { catalogQuery, type AppRow } from "@/lib/catalog";
import { canDownloadApp as canSeeApp } from "@/lib/access";
import { useAuth } from "@/hooks/use-auth";
import { logInstallEvent } from "@/lib/telemetry";
import { adbInstall, adbConnect, adbDisconnect, adbScan, adbShell, buildCommand, isConnected, isNativeAdb, isValidHost, savedHost, saveHost } from "@/lib/adb-bridge";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Firestick Remote Tools — 0G VAULT" },
      { name: "description", content: "Clear caches, force stop apps and reboot your Firestick from your phone." },
      { property: "og:title", content: "Firestick Remote Tools — 0G VAULT" },
      { property: "og:description", content: "One-tap Firestick maintenance from your phone over Wi-Fi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <StoreGate onBack={() => {}}><Tools /></StoreGate>,
});

type Status = "off" | "connecting" | "on";

function Tools() {
  const { data: actions = [] } = useQuery({ queryKey: ["remote-actions"], queryFn: async () => (await supabase.from("remote_actions").select("*").eq("is_active", true).order("sort_order").throwOnError()).data! });
  const [host, setHost] = useState("");
  const [status, setStatus] = useState<Status>("off");
  const [pkg, setPkg] = useState("");
  const [packages, setPackages] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [found, setFound] = useState<string[] | null>(null);
  const [scanning, setScanning] = useState(false);
  const { level, user } = useAuth();
  const { data: catalog } = useQuery(catalogQuery);
  const sendable = (catalog?.apps ?? []).filter((a) => a.apk_url && canSeeApp(level, a.audiences));
  const [sendId, setSendId] = useState("");
  const [sendPct, setSendPct] = useState<{ stage: string; pct: number } | null>(null);
  async function send(app: AppRow | undefined) {
    if (!app?.apk_url) return push("Pick an app to send first.");
    if (status !== "on") return push("Connect your Firestick first.");
    logInstallEvent(app.id, user?.id, "download_started");
    try {
      setSendPct({ stage: "Downloading to phone", pct: 0 });
      const out = await adbInstall(app.apk_url, (stage, pct) => setSendPct({ stage: stage === "download" ? "Downloading to phone" : "Sending to Firestick", pct }));
      if (!/success/i.test(out)) throw new Error(out || "Install failed");
      logInstallEvent(app.id, user?.id, "install_prompted");
      push(`${app.title} installed on your Firestick ✓`);
    } catch (e) {
      logInstallEvent(app.id, user?.id, "install_failed", (e as Error).message);
      push(`Send failed: ${(e as Error).message}`);
    } finally { setSendPct(null); }
  }
  useEffect(() => { setHost(savedHost()); if (isConnected()) setStatus("on"); }, []);
  const push = (s: string) => setLog((l) => [s, ...l].slice(0, 30));

  async function scan() {
    setScanning(true); setFound(null); push("Scanning your Wi-Fi for Firesticks…");
    try { const h = await adbScan(); setFound(h); push(h.length ? `Found ${h.length} device(s)` : "No Firesticks found — is ADB Debugging on?"); }
    catch (e) { push(`Scan failed: ${(e as Error).message}`); } finally { setScanning(false); }
  }

  async function connect(target = host) {
    if (status === "on" && target === host) { await adbDisconnect(); setStatus("off"); return; }
    if (!isValidHost(target)) return push("Enter your Firestick IP, e.g. 192.168.1.45");
    setHost(target);
    setStatus("connecting"); push("Connecting… accept 'Allow USB debugging' on your TV.");
    try {
      if (!(await adbConnect(target, 5555))) throw new Error("Connection refused");
      saveHost(target); setStatus("on"); push(`Connected to ${target}`);
      const out = await adbShell("pm list packages -3");
      setPackages(out.split("\n").map((l) => l.replace(/^.*package:/, "").trim()).filter(Boolean));
    } catch (e) { setStatus("off"); push(`Failed: ${(e as Error).message}`); }
  }

  async function run(a: (typeof actions)[number]) {
    try {
      const cmd = buildCommand(a.command, pkg);
      if (a.needs_confirmation && !confirm(`${a.label}${pkg && a.needs_package ? ` (${pkg})` : ""}?`)) return;
      setBusy(a.id); push(`$ ${cmd}`); push(await adbShell(cmd));
    } catch (e) { push(`Error: ${(e as Error).message}`); } finally { setBusy(null); }
  }

  const dot = status === "on" ? "bg-green-500" : status === "connecting" ? "bg-amber-400" : "bg-muted-foreground";
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-glow">Firestick Remote Tools</h1>
        <Link data-nav to="/" className="tv-focus rounded-lg px-3 py-2 text-muted-foreground">← Store</Link>
      </div>
      {!isNativeAdb() && <p className="rounded-xl border border-amber-500/40 p-3 text-sm text-muted-foreground">Simulator mode — real Firestick control works in the 0G VAULT phone app on the same Wi-Fi.</p>}

      <div className="glass space-y-3 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-sm"><span className={`h-3 w-3 rounded-full ${dot}`} />{status === "on" ? "Connected" : status === "connecting" ? "Waiting for TV…" : "Disconnected"}</div>
        <div className="flex gap-2">
          <input data-nav inputMode="decimal" value={host} onChange={(e) => setHost(e.target.value)} placeholder="Firestick IP (Settings → My Fire TV → About → Network)" className="tv-focus flex-1 rounded-xl border border-border bg-card px-4 py-3" />
          <button data-nav onClick={() => connect()} className="tv-focus rounded-xl bg-primary px-5 font-bold text-primary-foreground">{status === "on" ? "Disconnect" : "Connect"}</button>
        </div>
        <button data-nav onClick={scan} disabled={scanning || status === "connecting"} className="tv-focus flex w-full items-center justify-center gap-2 rounded-xl border border-glow/50 py-3 font-bold text-glow disabled:opacity-50">
          <Icons.Radar className="h-5 w-5" />{scanning ? "Scanning Wi-Fi…" : "Scan Wi-Fi for Firestick"}
        </button>
        {found && found.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {found.map((h) => (
              <button data-nav key={h} onClick={() => connect(h)} className="tv-focus flex items-center gap-3 rounded-xl bg-card p-3 text-left">
                <Icons.Tv className="h-6 w-6 text-primary" />
                <span><span className="block font-bold">Fire TV</span><span className="text-sm text-muted-foreground">{h}{h === host && status === "on" ? " · connected" : ""}</span></span>
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Turn on ADB Debugging in Fire TV Settings → My Fire TV → Developer Options first. Once connected, open any app in the store and tap "Send to Firestick".</p>
      </div>

      <div className="glass space-y-3 rounded-2xl p-5">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Icons.Zap className="h-5 w-5 text-glow" />Send app to Firestick</h2>
        <div className="grid max-h-80 gap-2 overflow-auto sm:grid-cols-2">
          {sendable.map((a) => (
            <button data-nav key={a.id} onClick={() => setSendId(a.id)} className={`tv-focus flex items-center gap-3 rounded-xl border p-3 text-left ${sendId === a.id ? "border-glow bg-glow/10" : "border-border bg-card"}`}>
              {a.icon_url ? <img src={a.icon_url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <Icons.Package className="h-10 w-10 text-primary" />}
              <span className="min-w-0"><span className="block truncate font-bold">{a.title}</span><span className="text-xs text-muted-foreground">v{a.version}{a.file_size ? ` · ${a.file_size}` : ""}</span></span>
            </button>
          ))}
          {!sendable.length && <p className="text-sm text-muted-foreground">No apps available to send yet.</p>}
        </div>
        {sendPct && <div><div className="mb-1 text-sm">{sendPct.stage} {sendPct.pct}%</div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-glow transition-all" style={{ width: `${sendPct.pct}%` }} /></div></div>}
        <button data-nav disabled={!sendId || status !== "on" || sendPct !== null} onClick={() => send(sendable.find((a) => a.id === sendId))} className="tv-focus w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-40">
          {status !== "on" ? "Connect your Firestick above first" : sendPct ? "Sending…" : "⚡ Send to Firestick"}
        </button>
      </div>

      {actions.some((a) => a.needs_package) && (
        <select value={pkg} onChange={(e) => setPkg(e.target.value)} className="w-full rounded-xl border border-border bg-card px-4 py-3">
          <option value="">Pick an app for app-specific buttons…</option>
          {packages.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map((a) => {
          const Icon = ((Icons as unknown as Record<string, Icons.LucideIcon>)[a.icon]) ?? Icons.Terminal;
          return (
            <button data-nav key={a.id} disabled={status !== "on" || busy !== null} onClick={() => run(a)} className="tv-focus glass flex flex-col items-start gap-2 rounded-2xl p-4 text-left disabled:opacity-40">
              <Icon className="h-6 w-6 text-primary" />
              <span className="font-bold">{busy === a.id ? "Running…" : a.label}</span>
              <span className="text-xs text-muted-foreground">{a.description}</span>
            </button>
          );
        })}
      </div>

      {log.length > 0 && <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-border bg-card p-4 font-mono text-xs">{log.join("\n")}</pre>}
    </div>
  );
}
