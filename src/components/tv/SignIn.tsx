import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { normalizeUsername, usernameError, usernameToEmail } from "@/lib/access";
import { Logo } from "./TvShell";

const field = "tv-focus w-full rounded-xl border border-input bg-muted px-5 py-4 text-xl text-foreground placeholder:text-muted-foreground focus:border-glow";
const btn = "tv-focus rounded-xl px-6 py-4 text-lg font-bold";

export function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const uErr = usernameError(username);
    if (uErr) return setError(uErr);
    if (password.length < 6) return setError("Password must be at least 6 characters");
    setBusy(true);
    const email = usernameToEmail(username);
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { username: normalizeUsername(username) } } });
    setBusy(false);
    if (res.error) {
      const msg = res.error.message;
      setError(/invalid login/i.test(msg) ? "Wrong username or password" : /already registered/i.test(msg) ? "That username is taken" : msg);
    }
  }

  async function google() {
    setError(null);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setError(r.error.message ?? "Google sign-in failed");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-10">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 30% 20%, color-mix(in oklab, var(--primary) 35%, transparent), transparent 55%), radial-gradient(circle at 80% 90%, color-mix(in oklab, var(--glow) 18%, transparent), transparent 50%)" }} />
      <form onSubmit={submit} className="glass relative w-full max-w-xl space-y-6 rounded-3xl p-10">
        <Logo />
        <h1 className="text-3xl font-extrabold">{mode === "in" ? "Sign in" : "Create account"}</h1>
        <input data-nav data-nav-autofocus className={field} placeholder="Username" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input data-nav className={field} type="password" placeholder="Password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="rounded-xl border border-vip/60 bg-vip/15 px-4 py-3 text-lg">{error}</p>}
        <button data-nav type="submit" disabled={busy} className={`${btn} w-full bg-primary text-primary-foreground disabled:opacity-60`}>
          {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
        <button data-nav type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }} className={`${btn} w-full bg-secondary text-secondary-foreground`}>
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
        <button data-nav type="button" onClick={google} className="tv-focus w-full rounded-xl py-2 text-sm text-muted-foreground">
          Staff sign in with Google
        </button>
      </form>
    </div>
  );
}
