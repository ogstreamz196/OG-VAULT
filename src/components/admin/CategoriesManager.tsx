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
          <div key={c.id} className="glass flex items-center gap-2 rounded-xl p-2">
            <span className="w-8 text-center text-muted-foreground">{i + 1}</span>
            <Input defaultValue={c.name} onBlur={(e) => rename(c, e.target.value)} />
            <label className="flex items-center gap-2 whitespace-nowrap text-xs text-vip"><Switch checked={c.is_vip} onCheckedChange={(v) => toggleVip(c, v)} />VIP only</label>
            <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
            <Button variant="secondary" size="sm" disabled={i === data.length - 1} onClick={() => move(i, 1)}>↓</Button>
            <Button variant="destructive" size="sm" onClick={() => remove(c)}>Remove</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
