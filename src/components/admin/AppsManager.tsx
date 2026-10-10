import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateStoreCopy } from "@/lib/ai-copy.functions";
import { researchApp } from "@/lib/ai-research.functions";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia, type AppRow, type CategoryRow } from "@/lib/catalog";
import { inspectApk, type ApkInfo } from "@/lib/apk-parser";
import type { TablesInsert } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppIcon } from "@/components/tv/TvShell";
import { AUDIENCES, tierFromAudiences } from "@/lib/access";

const AUDIENCE_LABEL = { guest: "Guest (D.EV MODE)", free: "Free members", vip: "VIP", boss: "Boss only" } as const;

type Draft = TablesInsert<"apps">;
const empty: Draft = { title: "", package_name: "", version: "1.0.0", build_number: 1, description: "", changelog: "", tier: "free", audiences: ["free", "vip"], is_active: true, is_featured: false, category_id: null, icon_url: null, banner_url: null, screenshots: [], apk_url: null, file_size: null };

export function AppsManager({ editId }: { editId?: string | undefined } = {}) {
  const qc = useQueryClient();
  const apps = useQuery({ queryKey: ["admin-apps"], queryFn: async () => (await supabase.from("apps").select("*").order("created_at", { ascending: false }).throwOnError()).data! });
  const cats = useQuery({ queryKey: ["admin-cats"], queryFn: async () => (await supabase.from("categories").select("*").order("sort_order").throwOnError()).data! });
  const [editing, setEditing] = useState<Draft | null>(null);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (opened || !editId || !apps.data) return;
    const a = apps.data.find((x) => x.id === editId);
    if (a) { setEditing({ ...a }); setOpened(true); }
  }, [editId, apps.data, opened]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-apps"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); };

  async function remove(a: AppRow) {
    if (!confirm(`Delete ${a.title}?`)) return;
    const { error } = await supabase.from("apps").delete().eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success("App deleted");
    refresh();
  }
  async function toggle(a: AppRow, p: { is_active?: boolean; is_featured?: boolean }) {
    const { error } = await supabase.from("apps").update(p).eq("id", a.id);
    if (error) toast.error(error.message); else refresh();
  }

  const needle = q.trim().toLowerCase();
  const list = (apps.data ?? []).filter((a) =>
    (cat === "all" || (cat === "none" ? !a.category_id : a.category_id === cat)) &&
    (!needle || a.title.toLowerCase().includes(needle) || a.package_name.toLowerCase().includes(needle)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">App Catalog</h2>
        <Button onClick={() => setEditing({ ...empty })}>Add app</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search title or package…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border bg-background px-3 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          <option value="none">No category</option>
          {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="grid gap-3">
        {list.map((a) => (
          <div key={a.id} className="glass flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <AppIcon title={a.title} url={a.icon_url} className="h-14 w-14 shrink-0 rounded-lg text-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5"><span className="truncate font-semibold">{a.title}</span>{a.audiences.map((x) => <span key={x} className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${x === "vip" ? "bg-vip text-primary-foreground" : x === "guest" ? "border border-muted-foreground text-muted-foreground" : "border border-glow/60 text-glow"}`}>{x}</span>)}</div>
                <div className="break-words text-xs text-muted-foreground sm:text-sm">{a.package_name || "no package"} · v{a.version} ({a.build_number}) · {cats.data?.find((c) => c.id === a.category_id)?.name ?? "No category"} · {a.apk_url ? "APK ready" : "No APK"}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs"><Switch checked={a.is_active} onCheckedChange={(v) => toggle(a, { is_active: v })} />Active</label>
              <label className="flex items-center gap-1.5 text-xs text-glow"><Switch checked={a.is_featured} onCheckedChange={(v) => toggle(a, { is_featured: v })} />Featured</label>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing({ ...a })}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => remove(a)}>Delete</Button>
              </div>
            </div>
          </div>
        ))}
        {apps.data?.length === 0 && <p className="text-muted-foreground">No apps yet.</p>}
        {!!apps.data?.length && list.length === 0 && <p className="text-muted-foreground">No apps match.</p>}
      </div>
      {editing && <AppEditor draft={editing} categories={cats.data ?? []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
    </div>
  );
}

function AppEditor({ draft, categories, onClose, onSaved }: { draft: Draft; categories: CategoryRow[]; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [busy, setBusy] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const [features, setFeatures] = useState("");
  const gen = useServerFn(generateStoreCopy);

  async function generate() {
    if (!d.title.trim()) { toast.error("Add a title first"); return; }
    setBusy("Groq is writing…");
    try {
      const r = await gen({ data: { title: d.title, category: categories.find((c) => c.id === d.category_id)?.name ?? "", features, changelog: d.changelog ?? "" } });
      if ("error" in r && r.error) { toast.error(r.error); return; }
      if ("description" in r) { set("description", r.description); set("changelog", r.releaseNotes); toast.success("Copy generated"); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setBusy(null); }
  }

  const research = useServerFn(researchApp);
  async function searchWeb(title: string, packageName: string, silent = false) {
    if (!title.trim() && !packageName.trim()) { if (!silent) toast.error("Add a title or pick an APK first"); return; }
    setBusy("Searching the web for this app…");
    try {
      const r = await research({ data: { title, packageName } });
      if ("error" in r && r.error) { toast.error(r.error); return; }
      if ("description" in r && r.description) {
        setD((p) => ({ ...p, description: r.description, title: p.title?.trim() ? p.title : r.title || p.title }));
        if (r.features) setFeatures(r.features);
        toast.success("Description found online — review before saving");
      }
    } catch { toast.error("Web search failed"); }
    finally { setBusy(null); }
  }

  const [apk, setApk] = useState<Omit<ApkInfo, "icon"> | null>(null);
  async function detect(file?: File) {
    if (!file) return;
    try {
      const info = await inspectApk(file);
      setApk(info);
      const label = info.label && !info.label.startsWith("@") ? info.label : "";
      setD((p) => ({
        ...p,
        package_name: info.packageName ?? p.package_name ?? "",
        version: info.versionName ?? p.version ?? "1.0.0",
        build_number: info.versionCode ?? p.build_number ?? 1,
        title: p.title?.trim() ? p.title : label || p.title,
      }));
      toast.success(`Detected ${info.packageName ?? "app"} v${info.versionName ?? "?"}`);
      if (info.icon) {
        try { const u = await uploadMedia("app-media", info.icon); set("icon_url", u); toast.success("App logo taken from the APK"); } catch { /* optional */ }
      } else toast.message("No logo found inside this APK — upload one manually");
      if (!d.description?.trim()) void searchWeb(d.title?.trim() || label, info.packageName ?? "", true);
    } catch (e) {
      toast.error(`Couldn't read APK details: ${e instanceof Error ? e.message : "unknown"} — fill them in manually`);
    }
  }

  async function upload(bucket: "app-media" | "apks", files: FileList | null, apply: (urls: string[]) => void) {
    if (!files?.length) return;
    setBusy(bucket === "apks" ? "Uploading APK…" : "Uploading image…");
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadMedia(bucket, f)));
      apply(urls);
      if (bucket === "apks" && files[0]) set("file_size", `${Math.round(files[0].size / 1e6)} MB`);
      toast.success("Uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!d.title.trim()) { toast.error("Title is required"); return; }
    if (!(d.audiences ?? []).length) { toast.error("Pick at least one group: Guest, Free or VIP"); return; }
    setBusy("Saving…");
    const payload = { ...d, tier: tierFromAudiences(d.audiences ?? []), updated_at: new Date().toISOString() };
    const { error } = d.id ? await supabase.from("apps").update(payload).eq("id", d.id) : await supabase.from("apps").insert(payload);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    onSaved();
  }

  const shots = d.screenshots ?? [];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{d.id ? "Edit app" : "New app"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <F label="Title"><Input value={d.title} onChange={(e) => set("title", e.target.value)} /></F>
          <F label="Package name"><Input value={d.package_name ?? ""} placeholder="com.example.app" onChange={(e) => set("package_name", e.target.value)} /></F>
          <F label="Version"><Input value={d.version ?? ""} onChange={(e) => set("version", e.target.value)} /></F>
          <F label="Build number"><Input type="number" value={d.build_number ?? 1} onChange={(e) => set("build_number", Number(e.target.value) || 1)} /></F>
          <F label="Category">
            <select className="h-9 w-full rounded-md border border-input bg-muted px-3 text-sm" value={d.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}>
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </F>
          <F label="Who can see this app">
            <div className="flex flex-wrap gap-4 pt-1">
              {AUDIENCES.map((a) => {
                const on = (d.audiences ?? []).includes(a);
                return (
                  <label key={a} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold ${on ? "border-glow text-glow" : "text-muted-foreground"}`}>
                    <input type="checkbox" checked={on} onChange={() => set("audiences", on ? (d.audiences ?? []).filter((x) => x !== a) : [...(d.audiences ?? []), a])} />
                    {AUDIENCE_LABEL[a]}
                  </label>
                );
              })}
            </div>
          </F>
          <div className="flex items-center gap-3"><Switch checked={d.is_active ?? true} onCheckedChange={(v) => set("is_active", v)} /><Label>Active (visible in store)</Label></div>
          <div className="flex items-center gap-3"><Switch checked={d.is_featured ?? false} onCheckedChange={(v) => set("is_featured", v)} /><Label>Featured in hero</Label></div>
        </div>
        <div className="space-y-2 rounded-xl border border-glow/40 p-4">
          <h3 className="font-semibold">✨ AI writer (Groq)</h3>
          <F label="Key features (one per line)"><Textarea rows={3} value={features} placeholder={"4K playback\nNo buffering\nRemote friendly"} onChange={(e) => setFeatures(e.target.value)} /></F>
          <p className="text-xs text-muted-foreground">Uses the title, category and changelog below. Results replace the Description and Changelog — review before saving.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={!!busy} onClick={() => searchWeb(d.title, d.package_name ?? "")}>🔎 Search web for this app</Button>
            <Button type="button" variant="secondary" disabled={!!busy} onClick={generate}>Generate description & release notes</Button>
          </div>
        </div>
        <F label="Description"><Textarea rows={4} value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} /></F>
        <F label="Changelog"><Textarea rows={3} value={d.changelog ?? ""} onChange={(e) => set("changelog", e.target.value)} /></F>

        <div className="space-y-4 rounded-xl border p-4">
          <h3 className="font-semibold">Media</h3>
          <div className="grid grid-cols-2 gap-4">
            <F label="Icon">
              <div className="flex items-center gap-3"><AppIcon title={d.title || "?"} url={d.icon_url ?? null} className="h-14 w-14 rounded-lg" />
                <Input type="file" accept="image/*" onChange={(e) => upload("app-media", e.target.files, ([u]) => set("icon_url", u))} /></div>
            </F>
            <F label="Hero banner">
              <div className="space-y-2">{d.banner_url && <img src={d.banner_url} alt="" className="h-14 w-full rounded object-cover" />}
                <Input type="file" accept="image/*" onChange={(e) => upload("app-media", e.target.files, ([u]) => set("banner_url", u))} /></div>
            </F>
          </div>
          <F label={`Screenshots (${shots.length})`}>
            <div className="flex flex-wrap gap-2">
              {shots.map((s, i) => (
                <div key={s + i} className="relative">
                  <img src={s} alt="" className="h-20 rounded object-cover" />
                  <button type="button" className="absolute right-1 top-1 rounded bg-destructive px-1.5 text-xs text-destructive-foreground" onClick={() => set("screenshots", shots.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            <Input type="file" accept="image/*" multiple onChange={(e) => upload("app-media", e.target.files, (u) => set("screenshots", [...shots, ...u]))} />
          </F>
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <h3 className="font-semibold">APK</h3>
          <F label="Upload .apk file (package, version, build, name & icon fill in automatically)"><Input type="file" accept=".apk,application/vnd.android.package-archive" onChange={async (e) => { const files = e.target.files; await detect(files?.[0]); upload("apks", files, ([u]) => set("apk_url", u)); }} /></F>
          {apk && (
            <div className="rounded-lg border border-glow/50 bg-muted/40 p-3 text-sm">
              <div className="font-semibold text-glow">📦 APK detected{apk.isTvApp ? " · Fire TV ready" : ""}</div>
              <div className="text-muted-foreground">{apk.packageName ?? "?"} · v{apk.versionName ?? "?"} (build {apk.versionCode ?? "?"}){apk.minSdk ? ` · Android SDK ${apk.minSdk}+` : ""}</div>
              <div className="text-muted-foreground">Launches: {apk.launchActivity ?? "no launcher screen found"}</div>
            </div>
          )}
          <F label="…or external download URL"><Input value={d.apk_url ?? ""} placeholder="https://cdn.example.com/app.apk" onChange={(e) => set("apk_url", e.target.value || null)} /></F>
          <F label="File size label"><Input value={d.file_size ?? ""} placeholder="25 MB" onChange={(e) => set("file_size", e.target.value || null)} /></F>
        </div>

        <div className="flex justify-end gap-2">
          {busy && <span className="mr-auto self-center text-sm text-glow">{busy}</span>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!!busy}>Save app</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
