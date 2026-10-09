import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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

  async function grant(id: string) {
    const { error } = await supabase.from("vip_members").upsert({ user_id: id, expires_at: null, code_id: null });
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
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground"><tr><th className="p-2">Username</th><th>Joined</th><th>VIP</th><th /></tr></thead>
        <tbody>
          {data?.profiles.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2 font-semibold">{p.username}</td>
              <td>{new Date(p.created_at).toLocaleDateString()}</td>
              <td className={active(p.id) ? "text-vip font-bold" : "text-muted-foreground"}>
                {active(p.id) ? `VIP${data?.vip.get(p.id)?.expires_at ? ` until ${new Date(data.vip.get(p.id)!.expires_at!).toLocaleDateString()}` : ""}` : "Member"}
              </td>
              <td className="py-2 text-right">
                {active(p.id) ? <Button size="sm" variant="secondary" onClick={() => revoke(p.id)}>Remove VIP</Button> : <Button size="sm" onClick={() => grant(p.id)}>Grant VIP</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data?.profiles.length === 0 && <p className="text-muted-foreground">No members yet.</p>}
    </div>
  );
}
