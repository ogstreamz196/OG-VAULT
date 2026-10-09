import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getVaultStatus } from "@/lib/vault.functions";
import { Button } from "@/components/ui/button";

export function OgVaultApiCard() {
  const fn = useServerFn(getVaultStatus);
  const { data, error, refetch, isFetching } = useQuery({ queryKey: ["og-vault-status"], queryFn: () => fn(), refetchInterval: 15000 });
  const url = typeof window !== "undefined" ? `${window.location.origin}/api/public/og-vault` : "";
  const status = !data ? null : !data.secretSet ? "missing" : data.lastPingAt ? "verified" : "waiting";

  return (
    <section className="glass space-y-4 rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">OG Vault API</h2>
        {status === "verified" && <span className="rounded-md border border-glow px-2 py-0.5 text-xs font-bold text-glow">VERIFIED · {new Date(data!.lastPingAt!).toLocaleString()}</span>}
        {status === "waiting" && <span className="rounded-md border border-primary px-2 py-0.5 text-xs font-bold text-primary">WAITING FOR TEST PING</span>}
        {status === "missing" && <span className="rounded-md border border-vip px-2 py-0.5 text-xs font-bold text-vip">SECRET MISSING</span>}
      </div>
      {error && <p className="text-sm text-vip">{(error as Error).message}</p>}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Receiving address — paste into your main app's OG Vault webhook</p>
        <div className="flex gap-2">
          <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 text-sm">{url}</code>
          <Button size="sm" onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Copied"))}>Copy</Button>
        </div>
      </div>
      <p className="text-sm">
        Secret <code>OG_VAULT_WEBHOOK_SECRET</code>: {data ? (data.secretSet ? "set" : "not set") : "…"}
        <span className="block text-muted-foreground">If you create a new secret in your main app, ask in chat to replace it here.</span>
      </p>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Synced logins ({data?.logins.length ?? 0})</h3>
          <Button size="sm" variant="secondary" disabled={isFetching} onClick={() => refetch()}>Refresh</Button>
        </div>
        <div className="divide-y rounded-lg border">
          {data?.logins.length === 0 && <p className="p-3 text-sm text-muted-foreground">No logins synced yet.</p>}
          {data?.logins.map((l) => (
            <div key={l.username} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="font-medium">{l.username}</span>
              <span className={l.active ? "text-glow" : "text-muted-foreground"}>{l.active ? "Active" : "Off"}</span>
              <span className="text-muted-foreground">{new Date(l.updated_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
