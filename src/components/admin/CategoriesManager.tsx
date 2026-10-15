import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AppRow, CategoryRow } from "@/lib/catalog";
import { byCategoryOrder, moveInCategory } from "@/lib/app-order";
import { tierFromAudiences } from "@/lib/access";
import { AppIcon } from "@/components/tv/TvShell";
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
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggleOpen = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
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
          <div key={c.id} className="glass flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="w-6 shrink-0 text-center text-muted-foreground">{i + 1}</span>
              <Input className="min-w-0 flex-1" defaultValue={c.name} onBlur={(e) => rename(c, e.target.value)} />
              <button type="button" onClick={() => toggleOpen(c.id)} aria-expanded={open.has(c.id)} aria-label={`${open.has(c.id) ? "Hide" : "Show"} apps in ${c.name}`} className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:border-glow hover:text-glow">
                {open.has(c.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}{counts?.get(c.id) ?? 0} apps
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 whitespace-nowrap text-xs text-vip"><Switch checked={c.is_vip} onCheckedChange={(v) => toggleVip(c, v)} />VIP only</label>
              <label className="mr-auto flex items-center gap-2 whitespace-nowrap text-xs text-glow"><Switch checked={c.is_boss} onCheckedChange={async (v) => { const { error } = await supabase.from("categories").update({ is_boss: v }).eq("id", c.id); if (error) toast.error(error.message); else refresh(); }} />Boss only</label>
              <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => move(i, -1)}>↑</Button>
              <Button variant="secondary" size="sm" disabled={i === data.length - 1} onClick={() => move(i, 1)}>↓</Button>
              <Button variant="destructive" size="sm" onClick={() => remove(c)}>Remove</Button>
            </div>
            {open.has(c.id) && <CategoryApps category={c} />}
          </div>
        ))}
      </div>
    </div>
  );
}

type OrderedApp = Pick<AppRow, "id" | "title" | "icon_url" | "version" | "audiences" | "category_id" | "sort_order" | "created_at" | "is_active">;

/** Apps in one category, in store order, with ↑ / ↓ to change it. */
function CategoryApps({ category }: { category: CategoryRow }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: apps, isLoading, error } = useQuery({
    queryKey: ["admin-category-apps", category.id],
    queryFn: async () => byCategoryOrder((await supabase.from("apps").select("id, title, icon_url, version, audiences, category_id, sort_order, created_at, is_active").eq("category_id", category.id).throwOnError()).data! as OrderedApp[]),
  });

  async function move(index: number, dir: -1 | 1) {
    if (!apps || busy) return;
    const writes = moveInCategory(apps, index, dir);
    if (!writes.length) return;
    setBusy(true);
    const results = await Promise.all(writes.map((w) => supabase.from("apps").update({ sort_order: w.sort_order }).eq("id", w.id)));
    setBusy(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) toast.error(/sort_order/.test(failed.error.message) ? "App ordering needs the latest database migration (app sort order) first." : failed.error.message);
    for (const key of [["admin-category-apps", category.id], ["admin-cats"], ["catalog"], ["admin-apps"]]) qc.invalidateQueries({ queryKey: key });
  }

  return (
    <div className="w-full space-y-1.5 border-t border-border/60 pt-2 sm:basis-full">
      {isLoading && <p className="px-2 text-sm text-muted-foreground">Loading apps…</p>}
      {error && <p className="px-2 text-sm text-vip">{/sort_order/.test(error.message) ? "App ordering needs the latest database migration (app sort order) first." : error.message}</p>}
      {apps?.length === 0 && <p className="px-2 text-sm text-muted-foreground">No apps in this category yet.</p>}
      {apps?.map((a, i) => {
        const tier = a.audiences.includes("boss") && a.audiences.length === 1 ? "boss" : a.audiences.includes("guest") ? "guest" : tierFromAudiences(a.audiences);
        return (
          <div key={a.id} className="flex items-center gap-3 rounded-lg bg-card/60 px-2 py-1.5">
            <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
            <AppIcon title={a.title} url={a.icon_url} className="h-9 w-9 shrink-0 rounded-md text-xs" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{a.title}{!a.is_active && <span className="ml-2 text-xs font-normal text-muted-foreground">(hidden)</span>}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>v{a.version}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${tier === "vip" ? "bg-vip text-primary-foreground" : tier === "guest" || tier === "boss" ? "border border-muted-foreground" : "border border-glow/60 text-glow"}`}>{tier}</span>
              </div>
            </div>
            <Button variant="secondary" size="sm" aria-label={`Move ${a.title} up`} disabled={busy || i === 0} onClick={() => move(i, -1)}>↑</Button>
            <Button variant="secondary" size="sm" aria-label={`Move ${a.title} down`} disabled={busy || i === apps.length - 1} onClick={() => move(i, 1)}>↓</Button>
          </div>
        );
      })}
      {category.is_vip && !!apps?.length && <p className="px-2 text-xs text-muted-foreground">VIP apps from other categories also show in this row on the store, after these, in their own category's order.</p>}
    </div>
  );
}
