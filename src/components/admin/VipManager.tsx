import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateVipCode } from "@/lib/access";
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
  const [q, setQ] = useState("");
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

  const needle = q.trim().toLowerCase();
  const list = data.filter((c) => !needle || c.code.toLowerCase().includes(needle) || c.note.toLowerCase().includes(needle));
  function copyAll() {
    const codes = list.filter((c) => status(c) === "Active").map((c) => c.code);
    if (!codes.length) { toast.error("No active codes to copy"); return; }
    navigator.clipboard?.writeText(codes.join("\n"));
    toast.success(`Copied ${codes.length} codes`);
  }
  function exportCsv() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [["Code", "Status", "Accounts used", "Device limit", "Expires", "Note", "Created"].join(",")];
    for (const c of list) lines.push([c.code, status(c), String(c.devices.length), String(c.device_limit), c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 10) : "Never", c.note, c.created_at.slice(0, 10)].map(esc).join(","));
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `og-vault-vip-codes-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">VIP Codes</h2>
      <div className="glass grid grid-cols-1 gap-3 rounded-xl p-4 sm:grid-cols-2 md:grid-cols-5">
        <div><Label>How many</Label><Input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
        <div><Label>Device limit</Label><Input type="number" min={1} value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></div>
        <div><Label>Valid days (0 = never expires)</Label><Input type="number" min={0} value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>
        <div><Label>Note</Label><Input value={note} placeholder="Customer name" onChange={(e) => setNote(e.target.value)} /></div>
        <div className="flex items-end"><Button className="w-full" onClick={create}>Generate</Button></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search code or note…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="secondary" onClick={copyAll}>Copy active codes</Button>
        <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-muted-foreground"><tr><th className="p-2">Code</th><th>Status</th><th>Accounts</th><th>Expires</th><th>Note</th><th /></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2 font-mono"><button className="hover:text-glow" onClick={() => { navigator.clipboard?.writeText(c.code); toast.success("Copied"); }}>{c.code}</button></td>
                <td className={status(c) === "Active" ? "text-glow" : "text-vip"}>{status(c)}</td>
                <td>{c.devices.length}/{c.device_limit}</td>
                <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}</td>
                <td className="max-w-40 truncate">{c.note}</td>
                <td className="space-x-1 whitespace-nowrap py-2 text-right">
                  <Button size="sm" variant="secondary" onClick={() => patch(c.id, { devices: [] })}>Reset accounts</Button>
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
