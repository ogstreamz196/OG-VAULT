import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AppRow = Tables<"apps">;
export type CategoryRow = Tables<"categories">;

export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: async () => {
    const [apps, cats] = await Promise.all([
      supabase.from("apps").select("*").eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("sort_order"),
    ]);
    if (apps.error) throw apps.error;
    if (cats.error) throw cats.error;
    return { apps: apps.data, categories: cats.data };
  },
});

export const appQuery = (id: string) =>
  queryOptions({
    queryKey: ["app", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("apps").select("*, categories(name)").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

/** Uploads to Cloudflare R2 when the boss switched it on; otherwise built-in storage (10-year signed URL). */
export async function uploadMedia(bucket: "app-media" | "apks", file: File): Promise<string> {
  const { getStorageMode, presignR2Upload } = await import("@/lib/r2.functions");
  const mode = await getStorageMode();
  if (mode.r2) {
    const { uploadUrl, publicUrl } = await presignR2Upload({ data: { fileName: file.name, contentType: file.type, folder: bucket === "apks" ? "apks" : "media" } });
    const res = await fetch(uploadUrl, { method: "PUT", body: file });
    if (!res.ok) throw new Error(`Cloudflare upload failed (${res.status}). Check the bucket's CORS policy.`);
    return publicUrl;
  }
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9._-]/gi, "_")}`;
  const up = await supabase.storage.from(bucket).upload(path, file, file.type ? { contentType: file.type } : {});
  if (up.error) throw up.error;
  const signed = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}
