import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { verifyPlaylist } from "@/lib/m3u.functions";
import { getDeviceId, setSession, type VaultSession } from "@/lib/vault-session";
import { Logo } from "./TvShell";

type Mode = "vip" | "xtream" | "m3u";

const field =
  "tv-focus w-full rounded-xl border border-input bg-muted px-5 py-4 text-xl text-foreground placeholder:text-muted-foreground focus:border-glow";
const btn = "tv-focus rounded-xl px-6 py-4 text-lg font-bold";

export function LoginGate({ onDone }: { onDone: (s: VaultSession) => void }) {
  const [mode, setMode] = useState<Mode>("vip");
  const [code, setCode] = useState("");
  const [server, setServer] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verify = useServerFn(verifyPlaylist);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "vip") {
        const { data, error } = await supabase.rpc("redeem_vip_code", { _code: code, _device: getDeviceId() });
        if (error) throw error;
        const r = data as { ok: boolean; error?: string; expires_at?: string | null };
        if (!r.ok) return setError(r.error ?? "Invalid code");
        const s: VaultSession = { kind: "vip", code: code.trim().toUpperCase(), expiresAt: r.expires_at ?? null };
        setSession(s);
        onDone(s);
      } else {
        const r = await verify({ data: mode === "xtream" ? { mode, server, username, password } : { mode, url } });
        if (!r.ok) return setError(r.error ?? "Login failed");
        const s: VaultSession = { kind: "playlist", label: r.label ?? "Playlist", expiresAt: r.expiresAt ?? null };
        setSession(s);
        onDone(s);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: "vip", label: "VIP Code" },
    { id: "xtream", label: "Xtream Login" },
    { id: "m3u", label: "M3U Link" },
  ];

  return (
    <div className="relative flex min-h-screen items-center justify-center p-10">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 30% 20%, color-mix(in oklab, var(--primary) 35%, transparent), transparent 55%), radial-gradient(circle at 80% 90%, color-mix(in oklab, var(--glow) 18%, transparent), transparent 50%)" }} />
      <form onSubmit={submit} className="glass relative w-full max-w-2xl space-y-6 rounded-3xl p-10">
        <Logo />
        <p className="text-lg text-muted-foreground">Unlock the vault. VIP codes open every app; playlist logins open the free tier.</p>
        <div className="flex gap-3">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              type="button"
              data-nav
              {...(i === 0 ? { "data-nav-autofocus": true } : {})}
              onClick={() => { setMode(t.id); setError(null); }}
              onFocus={() => { setMode(t.id); setError(null); }}
              className={`${btn} flex-1 ${mode === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === "vip" && (
          <input data-nav className={`${field} font-mono uppercase tracking-[0.25em]`} placeholder="OG-XXXX-XXXX" value={code} maxLength={12} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        )}
        {mode === "xtream" && (
          <div className="space-y-4">
            <input data-nav className={field} placeholder="Server URL (http://host:port)" value={server} onChange={(e) => setServer(e.target.value)} />
            <input data-nav className={field} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input data-nav className={field} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        )}
        {mode === "m3u" && (
          <input data-nav className={field} placeholder="https://provider/get.php?username=…&password=…" value={url} onChange={(e) => setUrl(e.target.value)} />
        )}

        {error && <p role="alert" className="rounded-xl border border-vip/60 bg-vip/15 px-4 py-3 text-lg text-foreground">{error}</p>}

        <button data-nav type="submit" disabled={busy} className={`${btn} w-full bg-primary text-primary-foreground disabled:opacity-60`}>
          {busy ? "Verifying…" : "Unlock Vault"}
        </button>
      </form>
    </div>
  );
}
