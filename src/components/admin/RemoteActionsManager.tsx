import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const AUD = ["guest", "free", "vip"] as const;
const empty = { label: "", description: "", icon: "Terminal", command: "", needs_confirmation: false, audiences: ["free", "vip"] as string[] };

export function RemoteActionsManager() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-remote"], queryFn: async () => (await supabase.from("remote_actions").select("*").order("sort_order").throwOnError()).data! });
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-remote"] }); qc.invalidateQueries({ queryKey: ["remote-actions"] }); };

  async function save() {
    if (!form.label.trim() || !form.command.trim()) return toast.error("Label and command are required");
    if (!form.audiences.length) return toast.error("Pick at least one audience");
    const row = { ...form, command: form.command.trim(), needs_package: form.command.includes("{package}") };
    const { error } = editId
      ? await supabase.from("remote_actions").update(row).eq("id", editId)
      : await supabase.from("remote_actions").insert({ ...row, sort_order: (data.at(-1)?.sort_order ?? 0) + 1 });
    if (error) return toast.error(error.message);
    toast.success(editId ? "Button updated" : "Button added");
    setForm(empty); setEditId(null); refresh();
  }
  async function patch(id: string, p: Record<string, unknown>) {
    const { error } = await supabase.from("remote_actions").update(p).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this button?")) return;
    await supabase.from("remote_actions").delete().eq("id", id); refresh();
  }
  async function move(i: number, d: -1 | 1) {
    const a = data[i], b = data[i + d]; if (!a || !b) return;
    await Promise.all([patch(a.id, { sort_order: b.sort_order }), patch(b.id, { sort_order: a.sort_order })]);
  }

  return (
    <div className="space-y-6">
      <div className="glass space-y-3 rounded-2xl p-5">
        <h3 className="text-lg font-bold">{editId ? "Edit button" : "Add custom Firestick button"}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Label (e.g. Clear Kodi cache)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          <Input placeholder="Icon (Trash2, Zap, Power, Terminal…)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          <Input className="sm:col-span-2" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Input className="sm:col-span-2 font-mono" placeholder="ADB shell command — use {package} for the picked app" value={form.command} onChange={(e) => setForm({ ...form, command: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {AUD.map((a) => (
            <label key={a} className="flex items-center gap-2 capitalize">
              <input type="checkbox" checked={form.audiences.includes(a)} onChange={(e) => setForm({ ...form, audiences: e.target.checked ? [...form.audiences, a] : form.audiences.filter((x) => x !== a) })} />{a}
            </label>
          ))}
          <label className="flex items-center gap-2"><Switch checked={form.needs_confirmation} onCheckedChange={(v) => setForm({ ...form, needs_confirmation: v })} />Ask "Are you sure?"</label>
        </div>
        <div className="flex gap-2">
          <Button onClick={save}>{editId ? "Save changes" : "Add button"}</Button>
          {editId && <Button variant="outline" onClick={() => { setEditId(null); setForm(empty); }}>Cancel</Button>}
        </div>
      </div>

      <div className="space-y-2">
        {data.map((r, i) => (
          <div key={r.id} className="glass flex flex-wrap items-center gap-3 rounded-xl p-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{r.label} <span className="text-xs text-muted-foreground">({r.audiences.join(", ")})</span></p>
              <p className="truncate font-mono text-xs text-muted-foreground">{r.command}</p>
            </div>
            <Switch checked={r.is_active} onCheckedChange={(v) => patch(r.id, { is_active: v })} />
            <Button size="sm" variant="outline" onClick={() => move(i, -1)}>↑</Button>
            <Button size="sm" variant="outline" onClick={() => move(i, 1)}>↓</Button>
            <Button size="sm" variant="outline" onClick={() => { setEditId(r.id); setForm({ label: r.label, description: r.description, icon: r.icon, command: r.command, needs_confirmation: r.needs_confirmation, audiences: r.audiences }); }}>Edit</Button>
            <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>Delete</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
