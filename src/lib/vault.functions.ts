import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hmacHex, safeEqual, vaultEmailLocal } from "@/lib/vault-crypto";

/** Boss-only: sync status + synced logins (never passwords, never the secret). */
export const getVaultStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Boss access only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: meta }, { data: rows }] = await Promise.all([
      supabaseAdmin.from("vault_sync_meta").select("last_ping_at,last_event_at").eq("id", 1).maybeSingle(),
      supabaseAdmin.from("vault_credentials").select("username,active,updated_at,note").order("updated_at", { ascending: false }),
    ]);
    return {
      secretSet: !!process.env["OG_VAULT_WEBHOOK_SECRET"],
      lastPingAt: meta?.last_ping_at ?? null,
      lastEventAt: meta?.last_event_at ?? null,
      logins: rows ?? [],
    };
  });

/** Store sign-in: only active synced OG Vault logins get a session. */
export const vaultSignIn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username: z.string().trim().min(1).max(200), password: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const secret = process.env["OG_VAULT_WEBHOOK_SECRET"];
    if (!secret) return { ok: false as const, error: "Sign-in is not set up yet" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("vault_credentials")
      .select("username,password,active")
      .ilike("username", data.username.replace(/[\\%_]/g, "\\$&"))
      .maybeSingle();
    if (!row || !row.active || !safeEqual(row.password, data.password)) return { ok: false as const, error: "Wrong OG Vault ID or PIN" };

    const local = vaultEmailLocal(row.username);
    const email = `${local}@users.ogvault.app`;
    // Auth password is derived server-side so short PINs still work and never hit auth directly.
    const authPw = await hmacHex(secret, `auth:${email}`);

    const { data: prof } = await supabaseAdmin.from("profiles").select("id").eq("username", local).maybeSingle();
    if (prof) {
      await supabaseAdmin.auth.admin.updateUserById(prof.id, { password: authPw });
    } else {
      const { error } = await supabaseAdmin.auth.admin.createUser({ email, password: authPw, email_confirm: true, user_metadata: { username: local } });
      if (error && !/already/i.test(error.message)) return { ok: false as const, error: "Could not open your account" };
      if (error) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const u = list?.users.find((x) => x.email === email);
        if (u) await supabaseAdmin.auth.admin.updateUserById(u.id, { password: authPw });
      }
    }
    return { ok: true as const, email, token: authPw };
  });
