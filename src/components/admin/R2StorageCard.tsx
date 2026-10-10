import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getR2Settings, saveR2Settings, testR2 } from "@/lib/r2.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const OPEN_KEY = "ogvault.r2Open";

export function R2StorageCard() {
  const qc = useQueryClient();
  const get = useServerFn(getR2Settings);
  const save = useServerFn(saveR2Settings);
  const test = useServerFn(testR2);
  const q = useQuery({ queryKey: ["r2-settings"], queryFn: () => get() });
  const [f, setF] = useState({ enabled: false, accountId: "", accessKeyId: "", secretAccessKey: "", bucket: "", publicBaseUrl: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
    } catch {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (q.data) setF({ ...q.data, secretAccessKey: "" });
  }, [q.data]);

  function toggleOpen() {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(OPEN_KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable — keep in-memory only */
      }
      return next;
    });
  }

  async function onSave() {
    setBusy(true);
    try {
      await save({ data: { ...f, secretAccessKey: f.secretAccessKey || undefined } });
      toast.success("Storage settings saved");
      qc.invalidateQueries({ queryKey: ["r2-settings"] });
      qc.invalidateQueries({ queryKey: ["storage-mode"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    setBusy(false);
  }
  async function onTest() {
    setBusy(true);
    setResult(await test());
    setBusy(false);
  }

  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const summary = [f.bucket, f.publicBaseUrl].filter(Boolean).join(" · ");

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="text-base font-bold sm:text-lg">Cloudflare R2 Storage</h3>
          <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${f.enabled ? "border border-glow text-glow" : "border text-muted-foreground"}`}>
            {f.enabled ? "R2 ACTIVE" : "BUILT-IN STORAGE"}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={toggleOpen} aria-expanded={open} className="shrink-0 gap-1 text-xs">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {open ? "Hide settings" : "Edit settings"}
        </Button>
      </div>

      {!open && (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {summary || "No bucket set yet — open settings to configure."}
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={f.enabled} onCheckedChange={(v) => set("enabled", v)} />
            <Label>Upload new APKs and images to Cloudflare R2</Label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Account ID</Label><Input value={f.accountId} onChange={(e) => set("accountId", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Bucket name</Label><Input value={f.bucket} placeholder="og-vault-apks" onChange={(e) => set("bucket", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Access Key ID</Label><Input value={f.accessKeyId} onChange={(e) => set("accessKeyId", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Secret Access Key</Label><Input type="password" value={f.secretAccessKey} placeholder={q.data?.maskedSecret ?? "Paste secret"} onChange={(e) => set("secretAccessKey", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Download domain</Label><Input value={f.publicBaseUrl} placeholder="https://download.fireunlock.co.uk" onChange={(e) => set("publicBaseUrl", e.target.value)} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onSave} disabled={busy}>Save</Button>
            <Button variant="secondary" onClick={onTest} disabled={busy}>Test Connection</Button>
            {result && <span className={`text-sm ${result.ok ? "text-glow" : "text-destructive"}`}>{result.message}</span>}
          </div>
          <p className="text-xs text-muted-foreground">Leave the secret box empty to keep the saved one. Existing apps keep their current download links.</p>
        </div>
      )}
    </div>
  );
}
