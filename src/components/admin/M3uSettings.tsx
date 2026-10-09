import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function M3uSettings() {
  const { data } = useQuery({ queryKey: ["m3u"], queryFn: async () => (await supabase.from("m3u_settings").select("*").eq("id", 1).single().throwOnError()).data! });
  const [s, setS] = useState<Tables<"m3u_settings"> | null>(null);
  const [hosts, setHosts] = useState("");
  useEffect(() => { if (data) { setS(data); setHosts(data.allowed_hosts.join(", ")); } }, [data]);
  if (!s) return <p className="text-muted-foreground">Loading…</p>;

  async function save() {
    const allowed_hosts = hosts.split(/[,\s]+/).map((h) => h.trim()).filter(Boolean);
    const { error } = await supabase.from("m3u_settings").update({ ...s!, allowed_hosts, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) toast.error(error.message); else toast.success("Settings saved");
  }
  const toggle = (k: "enabled" | "require_active_status" | "reject_expired", label: string) => (
    <div className="flex items-center gap-3"><Switch checked={s[k]} onCheckedChange={(v) => setS({ ...s, [k]: v })} /><Label>{label}</Label></div>
  );

  return (
    <div className="max-w-2xl space-y-5">
      <h2 className="text-2xl font-bold">Playlist Verification</h2>
      <div className="glass space-y-4 rounded-xl p-5">
        {toggle("enabled", "Allow M3U / Xtream logins")}
        {toggle("require_active_status", "Require provider account status to be Active")}
        {toggle("reject_expired", "Reject expired subscriptions")}
        <div><Label>Allowed provider hosts (comma separated, empty = any)</Label><Input value={hosts} placeholder="myprovider.com, cdn.myprovider.com" onChange={(e) => setHosts(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Minimum connections</Label><Input type="number" min={0} value={s.min_connections} onChange={(e) => setS({ ...s, min_connections: Number(e.target.value) })} /></div>
          <div><Label>Timeout (ms)</Label><Input type="number" min={2000} max={20000} value={s.timeout_ms} onChange={(e) => setS({ ...s, timeout_ms: Number(e.target.value) })} /></div>
        </div>
        <Button onClick={save}>Save settings</Button>
      </div>
    </div>
  );
}
