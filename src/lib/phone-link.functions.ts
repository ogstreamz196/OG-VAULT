import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canDownloadApp, type Level } from "@/lib/access";
import { createPhoneLinkToken, PHONE_LINK_TTL_MS } from "@/lib/phone-link";

export const phoneLinkSecret = () => process.env["PHONE_LINK_SECRET"] || process.env["VAULT_AUTH_SECRET"];

/**
 * Issues an encrypted, expiring download link for one app, only if the signed-in user may
 * download it. The TV turns the returned path into a QR code for the user's phone.
 */
export const createPhoneDownloadLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ appId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const secret = phoneLinkSecret();
    if (!secret) return { ok: false as const, error: "Phone downloads aren't set up yet." };
    // Read as the user, so visibility rules (RLS) apply exactly as in the store.
    const { data: app } = await context.supabase.from("apps").select("id, audiences, apk_url, is_active").eq("id", data.appId).maybeSingle();
    if (!app || !app.is_active) return { ok: false as const, error: "This app isn't available." };
    if (!app.apk_url) return { ok: false as const, error: "No APK file is available for this app yet." };
    const { data: level } = await context.supabase.rpc("user_level", { _user_id: context.userId });
    if (!canDownloadApp(((level as string | null) ?? "guest") as Level, app.audiences)) return { ok: false as const, error: "Your account can't download this app." };
    const expiresAt = Date.now() + PHONE_LINK_TTL_MS;
    const token = await createPhoneLinkToken({ appId: app.id, userId: context.userId, expiresAt }, secret);
    return { ok: true as const, path: `/api/public/dl/${token}`, expiresAt };
  });
