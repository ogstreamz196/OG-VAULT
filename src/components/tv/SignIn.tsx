import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { vaultSignIn } from "@/lib/vault.functions";
import vaultLogo from "@/assets/og-vault-logo.jpg.asset.json";

const field =
  "tv-focus w-full rounded-xl border border-input bg-muted/80 px-4 py-3.5 text-lg sm:px-5 sm:py-4 sm:text-xl text-foreground placeholder:text-muted-foreground focus:border-glow";
const btn = "tv-focus rounded-xl px-6 py-3.5 sm:py-4 text-base sm:text-lg font-bold";

export function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) return setError("Enter your 0G Vault ID and PIN");
    setBusy(true);
    try {
      const r = await vaultSignIn({ data: { username, password } });
      if (!r.ok) { setError(r.error); return; }
      const { error } = await supabase.auth.signInWithPassword({ email: r.email, password: r.token });
      if (error) setError("Could not unlock the vault, try again");
    } catch { setError("Could not reach the vault, try again"); }
    finally { setBusy(false); }
  }

  async function google() {
    setError(null);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setError(r.error.message ?? "Google sign-in failed");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 py-8 sm:py-10">
      {/* portal backdrop */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 28%, color-mix(in oklab, var(--glow) 28%, transparent), transparent 55%), radial-gradient(circle at 50% 100%, color-mix(in oklab, var(--vip) 22%, transparent), transparent 50%)" }} />

      <div className="relative mt-2 flex w-full max-w-[min(78vw,26rem,48vh)] items-center justify-center">
        <div className="animate-portal-spin absolute -inset-6 rounded-full opacity-70 blur-2xl sm:-inset-10"
          style={{ background: "conic-gradient(from 0deg, var(--glow), transparent 25%, var(--primary) 50%, transparent 75%, var(--glow))" }} />
        <div className="animate-portal-pulse absolute -inset-2 rounded-[2rem] border-2 border-glow/60 sm:-inset-3"
          style={{ boxShadow: "0 0 60px 6px color-mix(in oklab, var(--glow) 45%, transparent), inset 0 0 40px color-mix(in oklab, var(--glow) 35%, transparent)" }} />
        <img src={vaultLogo.url} alt="ØG-VAULT — All your apps in one place"
          className="animate-portal-in relative aspect-square w-full rounded-[1.75rem] object-cover object-top shadow-2xl" />
      </div>

      <form onSubmit={submit} className="glass animate-rise-in relative mt-8 w-full max-w-md space-y-4 rounded-3xl p-5 sm:mt-10 sm:max-w-xl sm:space-y-5 sm:p-8">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-glow">Vault access</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Enter the vault</h1>
        </div>
        <input data-nav data-nav-autofocus className={field} placeholder="0G Vault ID" autoComplete="username" autoCapitalize="none" autoCorrect="off" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input data-nav className={field} type="password" placeholder="PIN" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="rounded-xl border border-vip/60 bg-vip/15 px-4 py-3 text-base sm:text-lg">{error}</p>}
        <button data-nav type="submit" disabled={busy} className={`${btn} w-full bg-primary text-primary-foreground disabled:opacity-60`}>
          {busy ? "Unlocking…" : "Sign in"}
        </button>
        <button data-nav type="button" onClick={google} className="tv-focus w-full rounded-xl py-2 text-sm text-muted-foreground">
          D.EV MODE
        </button>
      </form>
    </div>
  );
}
