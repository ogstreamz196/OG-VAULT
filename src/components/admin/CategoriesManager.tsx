import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CategoryRow } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function CategoriesManager() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-cats"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order").throwOnError()).data! });
  const { data: counts } = useQuery({ queryKey: ["admin-cat-counts"], queryFn: async () => {
    const rows = (await supabase.from("apps").select("category_id").throwOnError()).data!;
    const m = new Map<string, number>(); for (const r of rows) if (r.category_id) m.set(r.category_id, (m.get(r.category_id) ?? 0) + 1); return m;
  } });
  const [name, setName] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-cats"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); };

  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("categories").insert({ name: name.trim(), slug: slugify(name) || crypto.randomUUID().slice(0, 8), sort_order: (data.at(-1)?.sort_order ?? 0) + 1 });
    if (error) { toast.error(error.message); return; }
    setName("");
    refresh();
  }
  async function rename(c: CategoryRow, n: string) {
    if (!n.trim() || n === c.name) return;
    const { error } = await supabase.from("categories").update({ name: n.trim() }).eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Renamed"); refresh(); }
  }
  async function toggleVip(c: CategoryRow, is_vip: boolean) {
    const { error } = await supabase.from("categories").update({ is_vip }).eq("id", c.id);
    if (error) toast.error(error.message); else refresh();
  }
  async function move(i: number, dir: -1 | 1) {
    const a = data[i], b = data[i + dir];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    refresh();
  }
  async function remove(c: CategoryRow) {
    if (!confirm(`Remove ${c.name}? Apps in it will become uncategorized.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) toast.error(error.message); else refresh();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Categories</h2>
      <div className="flex gap-2"><Input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} /><Button onClick={add}>Add</Button></div>
      <div className="space-y-2">
        {data.map((c, i) => (
          <div key={c.id} className="glass flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="w-6 shrink-0 text-center text-muted-foreground">{i + 1}</span>
              <Input className="min-w-0 flex-1" defaultValue={c.name} onBlur={(e) => rename(c, e.target.value)} />
              <span className="shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{counts?.get(c.id) ?? 0} apps</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 whitespace-nowrap text-xs text-vip"><Switch checked={c.is_vip} onCheckedChange={(v) => toggleVip(c, v)} />VIP only</label>
              <label className="mr-auto flex items-center gap-2 whitespace-nowrap text-xs text-glow"><Switch checked={c.is_boss} onCheckedChange={async (v) => { const { error } = await supabase.from("categories").update({ is_boss: v }).eq("id", c.id); if (error) toast.error(error.message); else refresh(); }} />Boss only</label>
              <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
              <Button variant="secondary" size="sm" disabled={i === data.length - 1} onClick={() => move(i, 1)}>↓</Button>
              <Button variant="destructive" size="sm" onClick={() => remove(c)}>Remove</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
