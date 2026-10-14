import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/catalog";
import { inspectApk } from "@/lib/apk-parser";
import { STORE_PACKAGE, storeReleaseQuery } from "@/lib/store-release";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** Boss Controls: publish a new build of the 0G VAULT store APK for devices to self-update. */
export function StoreReleaseCard() {
  const qc = useQueryClient();
  const { data: current, isLoading } = useQuery(storeReleaseQuery);
  const [version, setVersion] = useState("");
  const [build, setBuild] = useState(0);
  const [apkUrl, setApkUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    if (!current) return;
    setVersion(current.version);
    setBuild(current.build_number);
    setApkUrl(current.apk_url ?? "");
    setNotes(current.changelog);
    setMandatory(current.is_mandatory);
  }, [current]);

  const published = current?.build_number ?? 0;

  async function pickApk(file?: File) {
    if (!file) return;
    try {
      const info = await inspectApk(file);
      if (info.packageName && info.packageName !== STORE_PACKAGE) {
        toast.error(`This APK is ${info.packageName}, not the 0G VAULT store (${STORE_PACKAGE}). Upload it under Apps instead.`);
        return;
      }
      if (info.versionName) setVersion(info.versionName);
      if (info.versionCode) setBuild(info.versionCode);
      if (info.versionCode && info.versionCode <= published)
        toast.warning(`This APK is build ${info.versionCode}, but build ${published} is already published. Raise versionCode in android/app/build.gradle and rebuild, or devices won't update.`);
    } catch {
      toast.message("Couldn't read the APK details — fill in the version and build yourself");
    }
    setBusy("Uploading APK…");
    try {
      setApkUrl(await uploadMedia("apks", file));
      toast.success("APK uploaded — review the details and publish");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    if (!version.trim()) { toast.error("Add a version, e.g. 1.1.0"); return; }
    if (!build || build < 1) { toast.error("Add the build number (the APK's versionCode)"); return; }
    if (!apkUrl.trim()) { toast.error("Upload the store APK first"); return; }
    if (build <= published && !confirm(`Build ${build} is not newer than the published build ${published}. Devices only update when the build goes up. Publish anyway?`)) return;
    setBusy("Publishing…");
    const { error } = await supabase.from("store_release").upsert({
      id: 1, version: version.trim(), build_number: build, apk_url: apkUrl.trim(), changelog: notes.trim(), is_mandatory: mandatory, updated_at: new Date().toISOString(),
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`0G VAULT v${version.trim()} (build ${build}) published — devices will offer the update`);
    qc.invalidateQueries({ queryKey: ["store-release"] });
  }

  return (
    <div className="glass space-y-4 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold">⚡ 0G VAULT Store Updates</h3>
        <span className="rounded-md border border-glow/60 px-2 py-0.5 text-xs font-bold text-glow">
          {isLoading ? "Loading…" : current?.build_number ? `Live: v${current.version} · build ${current.build_number}` : "No store update published yet"}
        </span>
      </div>
      {!isLoading && !current && (
        <p className="rounded-lg border border-vip/50 p-3 text-sm text-muted-foreground">The store release table isn't available yet. Apply the latest database migration (store_release), then reload this page.</p>
      )}
      <p className="text-sm text-muted-foreground">
        Upload a new build of the store APK ({STORE_PACKAGE}). Firesticks and phones running an older build see an "Update Available" button and install it in place.
        The build number must be higher than the one installed on devices, and the APK must be signed with the same key as before.
      </p>
      <div className="space-y-1.5">
        <Label>Store APK</Label>
        <Input type="file" accept=".apk,application/vnd.android.package-archive" disabled={!!busy} onChange={(e) => pickApk(e.target.files?.[0])} />
        {apkUrl && <p className="truncate text-xs text-muted-foreground" title={apkUrl}>APK ready ✓</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Version</Label><Input value={version} placeholder="1.1.0" onChange={(e) => setVersion(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Build number (versionCode)</Label><Input type="number" min={1} value={build || ""} placeholder={String(published + 1)} onChange={(e) => setBuild(Number(e.target.value) || 0)} /></div>
      </div>
      <div className="space-y-1.5"><Label>Release notes</Label><Textarea rows={4} value={notes} placeholder={"Faster app downloads\nRemote navigation fixes"} onChange={(e) => setNotes(e.target.value)} /></div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={mandatory} onCheckedChange={setMandatory} />Required update (opens automatically and can't be skipped)</label>
      <div className="flex items-center justify-end gap-3">
        {busy && <span className="mr-auto text-sm text-glow">{busy}</span>}
        <Button onClick={publish} disabled={!!busy}>Publish Update</Button>
      </div>
    </div>
  );
}
