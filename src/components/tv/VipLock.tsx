import { Lock } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function VipLock({ title = "OG VIP ACCESS" }: { title?: string }) {
  const { refreshAccess } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.rpc("redeem_vip_for_me", { _code: code });
    setBusy(false);
    const r = data as { ok: boolean; error?: string } | null;
    if (error || !r?.ok) return setMsg(error?.message ?? r?.error ?? "Invalid code");
    refreshAccess();
  }

  return (
    <div className="glass mx-auto max-w-2xl space-y-6 rounded-3xl border-vip/50 p-10 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-vip/20 text-4xl"><Lock className="h-9 w-9 text-vip" /></div>
      <h2 className="text-4xl font-extrabold">{title}</h2>
      <p className="text-xl text-muted-foreground">VIP user area. Enter your VIP access code to unlock every VIP app.</p>
      <form onSubmit={redeem} className="space-y-4">
        <input data-nav data-nav-autofocus value={code} maxLength={12} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="OG-XXXX-XXXX"
          className="tv-focus w-full rounded-xl border border-input bg-muted px-5 py-4 text-center font-mono text-2xl uppercase tracking-[0.25em] focus:border-glow" />
        {msg && <p role="alert" className="text-lg text-vip">{msg}</p>}
        <button data-nav disabled={busy} className="tv-focus w-full rounded-xl bg-vip px-6 py-4 text-lg font-bold text-primary-foreground disabled:opacity-60">
          {busy ? "Checking…" : "Unlock VIP"}
        </button>
      </form>
    </div>
  );
}
