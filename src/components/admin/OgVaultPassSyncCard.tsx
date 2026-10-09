import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getVaultSync, saveVaultSync, syncVaultNow, testVaultConnection } from "@/lib/vault.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function OgVaultPassSyncCard() {
  const qc = useQueryClient();
  const getFn = useServerFn(getVaultSync);
  const saveFn = useServerFn(saveVaultSync);
  const testFn = useServerFn(testVaultConnection);
  const syncFn = useServerFn(syncVaultNow);
  const { data, error } = useQuery({ queryKey: ["og-vault-sync"], queryFn: () => getFn() });
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["og-vault-sync"] });

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    try { await fn(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); refresh(); }
  }

  const badge = data?.status === "connected" ? ["Connected", "border-glow text-glow"] : data?.status === "error" ? ["Error", "border-vip text-vip"] : ["Not configured", "border-muted-foreground text-muted-foreground"];

  return (
    <section className="glass space-y-5 rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">OG Vault Pass Sync</h2>
        <span className={`rounded-md border px-2 py-0.5 text-xs font-bold uppercase ${badge[1]}`}>{badge[0]}</span>
      </div>
      <p className="text-sm text-muted-foreground">Copy the key from OG BOT → Boss Controls → API & Integrations → OG Vault API, paste it here, then press Test Connection.</p>
      {error && <p className="text-sm text-vip">{(error as Error).message}</p>}

      <div className="flex items-center gap-3">
        <Switch id="ogv-enabled" checked={data?.enabled ?? false} disabled={!data || !!busy}
          onCheckedChange={(v) => run("toggle", () => saveFn({ data: { enabled: v } }))} />
        <Label htmlFor="ogv-enabled">Enable OG Vault Sync</Label>
      </div>

      <div className="space-y-2">
        <Label>OG Vault API Key</Label>
        {data?.maskedKey && <p className="font-mono text-sm">{data.maskedKey}</p>}
        <div className="flex flex-wrap gap-2">
          <Input type="password" className="max-w-sm" placeholder="ogv_..." value={key} autoComplete="off" onChange={(e) => setKey(e.target.value)} />
          <Button disabled={key.trim().length < 8 || !!busy} onClick={() => run("save", async () => { await saveFn({ data: { apiKey: key.trim() } }); setKey(""); toast.success("Key saved"); })}>
            {data?.maskedKey ? "Replace key" : "Save key"}
          </Button>
          {data?.maskedKey && <Button variant="destructive" disabled={!!busy} onClick={() => confirm("Remove the API key? Sync will turn off.") && run("remove", () => saveFn({ data: { removeKey: true } }))}>Remove</Button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={!data?.maskedKey || !!busy} onClick={() => run("test", async () => { const r = await testFn(); r.ok ? toast.success(r.message) : toast.error(r.message); })}>
          {busy === "test" ? "Testing…" : "Test Connection"}
        </Button>
        <Button variant="secondary" disabled={!data?.enabled || !data?.maskedKey || !!busy} onClick={() => run("sync", async () => { const r = await syncFn(); r.ok ? toast.success(r.message) : toast.error(r.message); })}>
          {busy === "sync" ? "Syncing…" : "Sync now"}
        </Button>
      </div>

      <div className="grid gap-1 text-sm">
        {data?.status === "connected" && <p className="text-glow">Connected to OG BOT Vault ({data.activeCount ?? 0} active logins){data.keyName ? ` · ${data.keyName}` : ""}</p>}
        <p>Last successful sync: {data?.lastSyncedAt ? new Date(data.lastSyncedAt).toLocaleString() : "Never"}</p>
        {data?.lastError && <p className="text-vip">Last error: {data.lastError}{data.lastErrorAt ? ` (${new Date(data.lastErrorAt).toLocaleString()})` : ""}</p>}
        <p className="text-muted-foreground">Syncs automatically every 15 minutes while enabled.</p>
      </div>

      <div>
        <h3 className="mb-2 font-semibold">Synced logins ({data?.logins.length ?? 0})</h3>
        <div className="divide-y rounded-lg border">
          {data?.logins.length === 0 && <p className="p-3 text-sm text-muted-foreground">No logins synced yet.</p>}
          {data?.logins.map((l) => (
            <div key={l.username} className="grid grid-cols-3 gap-3 p-3 text-sm">
              <span className="font-medium">{l.username}</span>
              <span className={l.active ? "text-glow" : "text-muted-foreground"}>{l.active ? "Active" : "Inactive"}</span>
              <span className="truncate text-muted-foreground">{l.note}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
