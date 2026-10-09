import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateVipCode } from "@/lib/vault-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VipManager() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["vip"], queryFn: async () => (await supabase.from("vip_codes").select("*").order("created_at", { ascending: false }).throwOnError()).data! });
  const [count, setCount] = useState(1);
  const [limit, setLimit] = useState(1);
  const [days, setDays] = useState(30);
  const [note, setNote] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["vip"] });

  async function create() {
    const n = Math.min(Math.max(count, 1), 100);
    const expires_at = days > 0 ? new Date(Date.now() + days * 864e5).toISOString() : null;
    const rows = Array.from({ length: n }, () => ({ code: generateVipCode(), device_limit: Math.max(limit, 1), expires_at, note }));
    const { error } = await supabase.from("vip_codes").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`${n} code${n > 1 ? "s" : ""} created`);
    refresh();
  }
  async function patch(id: string, p: { revoked?: boolean; expires_at?: string | null; devices?: string[] }) {
    const { error } = await supabase.from("vip_codes").update(p).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this code?")) return;
    await supabase.from("vip_codes").delete().eq("id", id);
    refresh();
  }

  const status = (c: (typeof data)[number]) => c.revoked ? "Revoked" : c.expires_at && new Date(c.expires_at) < new Date() ? "Expired" : "Active";

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">VIP Codes</h2>
      <div className="glass grid grid-cols-2 gap-3 rounded-xl p-4 md:grid-cols-5">
        <div><Label>How many</Label><Input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
        <div><Label>Device limit</Label><Input type="number" min={1} value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></div>
        <div><Label>Valid days (0 = never expires)</Label><Input type="number" min={0} value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>
        <div><Label>Note</Label><Input value={note} placeholder="Customer name" onChange={(e) => setNote(e.target.value)} /></div>
        <div className="flex items-end"><Button className="w-full" onClick={create}>Generate</Button></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground"><tr><th className="p-2">Code</th><th>Status</th><th>Devices</th><th>Expires</th><th>Note</th><th /></tr></thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2 font-mono"><button className="hover:text-glow" onClick={() => { navigator.clipboard?.writeText(c.code); toast.success("Copied"); }}>{c.code}</button></td>
                <td className={status(c) === "Active" ? "text-glow" : "text-vip"}>{status(c)}</td>
                <td>{c.devices.length}/{c.device_limit}</td>
                <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}</td>
                <td className="max-w-40 truncate">{c.note}</td>
                <td className="space-x-1 whitespace-nowrap py-2 text-right">
                  <Button size="sm" variant="secondary" onClick={() => patch(c.id, { devices: [] })}>Reset devices</Button>
                  <Button size="sm" variant="secondary" onClick={() => patch(c.id, { expires_at: new Date().toISOString() })}>Expire</Button>
                  <Button size="sm" variant="secondary" onClick={() => patch(c.id, { revoked: !c.revoked })}>{c.revoked ? "Restore" : "Revoke"}</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(c.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <p className="p-4 text-muted-foreground">No codes yet.</p>}
      </div>
    </div>
  );
}
