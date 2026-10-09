import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertBoss(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Boss access only");
}

async function loadSettings() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("storage_settings").select("*").eq("id", 1).maybeSingle();
  return data;
}

function mask(v?: string | null) {
  return v ? `••••••••${v.slice(-4)}` : null;
}

async function client() {
  const s = await loadSettings();
  if (!s?.account_id || !s.access_key_id || !s.secret_access_key || !s.bucket) throw new Error("Cloudflare R2 is not fully set up");
  const { AwsClient } = await import("aws4fetch");
  const aws = new AwsClient({ accessKeyId: s.access_key_id, secretAccessKey: s.secret_access_key, service: "s3", region: "auto" });
  const base = `https://${s.account_id}.r2.cloudflarestorage.com/${s.bucket}`;
  return { s, aws, base };
}

/** Public (any signed-in user): is R2 switched on? Used by the uploader. */
export const getStorageMode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const s = await loadSettings();
    return { r2: !!(s?.enabled && s.account_id && s.access_key_id && s.secret_access_key && s.bucket) };
  });

export const getR2Settings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertBoss(context);
    const s = await loadSettings();
    return {
      enabled: s?.enabled ?? false,
      accountId: s?.account_id ?? "",
      accessKeyId: s?.access_key_id ?? "",
      maskedSecret: mask(s?.secret_access_key),
      bucket: s?.bucket ?? "",
      publicBaseUrl: s?.public_base_url ?? "",
    };
  });

export const saveR2Settings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      enabled: z.boolean(),
      accountId: z.string().trim().max(100),
      accessKeyId: z.string().trim().max(200),
      secretAccessKey: z.string().trim().max(500).optional(),
      bucket: z.string().trim().max(100),
      publicBaseUrl: z.string().trim().max(300),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertBoss(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { enabled: boolean; account_id: string | null; access_key_id: string | null; bucket: string | null; public_base_url: string | null; updated_at: string; secret_access_key?: string } = {
      enabled: data.enabled,
      account_id: data.accountId || null,
      access_key_id: data.accessKeyId || null,
      bucket: data.bucket || null,
      public_base_url: data.publicBaseUrl.replace(/\/+$/, "") || null,
      updated_at: new Date().toISOString(),
    };
    if (data.secretAccessKey) patch.secret_access_key = data.secretAccessKey;
    const { error } = await supabaseAdmin.from("storage_settings").update(patch).eq("id", 1);
    if (error) throw new Error("Could not save storage settings");
    return { ok: true };
  });

export const testR2 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertBoss(context);
    try {
      const { aws, base } = await client();
      const res = await aws.fetch(`${base}?list-type=2&max-keys=1`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) return { ok: true, message: "Connected to Cloudflare R2" };
      const body = await res.text();
      const code = body.match(/<Code>(.*?)<\/Code>/)?.[1] ?? `HTTP ${res.status}`;
      return { ok: false, message: `R2 refused: ${code}` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Connection failed" };
    }
  });

/** Boss-only: short-lived signed PUT URL so the browser uploads straight to R2. */
export const presignR2Upload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ fileName: z.string().min(1).max(300), contentType: z.string().max(200), folder: z.enum(["apks", "media"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertBoss(context);
    const { s, aws, base } = await client();
    const safe = data.fileName.replace(/[^a-z0-9._-]/gi, "_");
    const key = `${data.folder}/${crypto.randomUUID().slice(0, 8)}-${safe}`;
    const signed = await aws.sign(`${base}/${key}?X-Amz-Expires=3600`, { method: "PUT", aws: { signQuery: true } });
    const pub = (s.public_base_url ?? "").replace(/\/+$/, "");
    return { uploadUrl: signed.url, publicUrl: `${pub}/${key}` };
  });
