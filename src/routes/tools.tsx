import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoreGate } from "@/components/tv/StoreGate";
import { adbConnect, adbDisconnect, adbShell, buildCommand, isNativeAdb, isValidHost } from "@/lib/adb-bridge";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Firestick Remote Tools — OG VAULT" },
      { name: "description", content: "Clear caches, force stop apps and reboot your Firestick from your phone." },
      { property: "og:title", content: "Firestick Remote Tools — OG VAULT" },
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
  useEffect(() => { setHost(localStorage.getItem("ogvault.adbHost") ?? ""); }, []);
  const push = (s: string) => setLog((l) => [s, ...l].slice(0, 30));

  async function connect() {
    if (status === "on") { await adbDisconnect(); setStatus("off"); return; }
    if (!isValidHost(host)) return push("Enter your Firestick IP, e.g. 192.168.1.45");
    setStatus("connecting"); push("Connecting… accept 'Allow USB debugging' on your TV.");
    try {
      if (!(await adbConnect(host, 5555))) throw new Error("Connection refused");
      localStorage.setItem("ogvault.adbHost", host); setStatus("on"); push(`Connected to ${host}`);
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
      {!isNativeAdb() && <p className="rounded-xl border border-amber-500/40 p-3 text-sm text-muted-foreground">Simulator mode — real Firestick control works in the OG VAULT phone app on the same Wi-Fi.</p>}

      <div className="glass space-y-3 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-sm"><span className={`h-3 w-3 rounded-full ${dot}`} />{status === "on" ? "Connected" : status === "connecting" ? "Waiting for TV…" : "Disconnected"}</div>
        <div className="flex gap-2">
          <input data-nav inputMode="decimal" value={host} onChange={(e) => setHost(e.target.value)} placeholder="Firestick IP (Settings → My Fire TV → About → Network)" className="tv-focus flex-1 rounded-xl border border-border bg-card px-4 py-3" />
          <button data-nav onClick={connect} className="tv-focus rounded-xl bg-primary px-5 font-bold text-primary-foreground">{status === "on" ? "Disconnect" : "Connect"}</button>
        </div>
        <p className="text-xs text-muted-foreground">Turn on ADB Debugging in Fire TV Settings → My Fire TV → Developer Options first.</p>
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
