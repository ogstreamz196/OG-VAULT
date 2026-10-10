import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const DURATIONS = [["30", "1 month"], ["90", "3 months"], ["180", "6 months"], ["365", "1 year"], ["0", "Lifetime"]] as const;

export function MembersManager() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const [p, v] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).throwOnError(),
        supabase.from("vip_members").select("*").throwOnError(),
      ]);
      return { profiles: p.data!, vip: new Map(v.data!.map((m) => [m.user_id, m])) };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["members"] });

  const [dur, setDur] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  async function grant(id: string) {
    const days = Number(dur[id] ?? "30");
    const expires_at = days > 0 ? new Date(Date.now() + days * 864e5).toISOString() : null;
    const { error } = await supabase.from("vip_members").upsert({ user_id: id, expires_at, code_id: null });
    if (error) toast.error(error.message); else { toast.success("VIP granted"); refresh(); }
  }
  async function revoke(id: string) {
    const { error } = await supabase.from("vip_members").delete().eq("user_id", id);
    if (error) toast.error(error.message); else { toast.success("VIP removed"); refresh(); }
  }

  const active = (id: string) => {
    const m = data?.vip.get(id);
    return !!m && (!m.expires_at || new Date(m.expires_at) > new Date());
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Members</h2>
      <Input className="max-w-xs" placeholder="Search username…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="text-left text-muted-foreground"><tr><th className="p-2">Username</th><th>Joined</th><th>VIP</th><th /></tr></thead>
        <tbody>
          {data?.profiles.filter((p) => p.username.toLowerCase().includes(q.trim().toLowerCase())).map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2 font-semibold">{p.username}</td>
              <td>{new Date(p.created_at).toLocaleDateString()}</td>
              <td className={active(p.id) ? "text-vip font-bold" : "text-muted-foreground"}>
                {active(p.id) ? `VIP${data?.vip.get(p.id)?.expires_at ? ` until ${new Date(data.vip.get(p.id)!.expires_at!).toLocaleDateString()}` : ""}` : "Member"}
              </td>
              <td className="whitespace-nowrap py-2 text-right">
                <span className="inline-flex items-center gap-2">
                  {!active(p.id) && <select className="rounded-md border bg-background px-2 py-1 text-sm" value={dur[p.id] ?? "30"} onChange={(e) => setDur((d) => ({ ...d, [p.id]: e.target.value }))}>{DURATIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>}
                  <span className="text-xs text-muted-foreground">Free</span>
                  <Switch checked={active(p.id)} onCheckedChange={(on) => (on ? grant(p.id) : revoke(p.id))} aria-label={`VIP for ${p.username}`} />
                  <span className="text-xs font-bold text-vip">VIP</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {data?.profiles.length === 0 && <p className="text-muted-foreground">No members yet.</p>}
    </div>
  );
}
