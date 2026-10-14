import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hmacHex, safeEqual, vaultEmailLocal } from "@/lib/vault-crypto";

async function assertBoss(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Boss access only");
}

/** Boss-only: sync config (masked key) + synced logins (never passwords). */
export const getVaultSync = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertBoss(context);
    const { getSettings, maskKey } = await import("@/lib/vault-sync.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [s, { data: rows }] = await Promise.all([
      getSettings(),
      supabaseAdmin.from("vault_credentials").select("username,active,note,synced_at").order("username"),
    ]);
    return {
      enabled: s?.enabled ?? false,
      maskedKey: maskKey(s?.api_key),
      status: (!s?.api_key ? "not_configured" : s.status === "error" ? "error" : s.status === "connected" ? "connected" : "not_configured") as "not_configured" | "connected" | "error",
      keyName: s?.key_name ?? null,
      activeCount: s?.active_count ?? null,
      lastSyncedAt: s?.last_synced_at ?? null,
      lastError: s?.last_error ?? null,
      lastErrorAt: s?.last_error_at ?? null,
      logins: rows ?? [],
    };
  });

export const saveVaultSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ enabled: z.boolean().optional(), apiKey: z.string().trim().min(8).max(500).optional(), removeKey: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertBoss(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { updated_at: string; enabled?: boolean; api_key?: string | null; status?: string; key_name?: string | null; active_count?: number | null; last_error?: string | null } = { updated_at: new Date().toISOString() };
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.apiKey) Object.assign(patch, { api_key: data.apiKey, status: "not_configured", last_error: null, key_name: null });
    if (data.removeKey) Object.assign(patch, { api_key: null, enabled: false, status: "not_configured", key_name: null, active_count: null, last_error: null });
    const { error } = await supabaseAdmin.from("vault_sync_settings").update(patch).eq("id", 1);
    if (error) throw new Error("Could not save settings");
    return { ok: true };
  });

export const testVaultConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertBoss(context);
    const { pingVault } = await import("@/lib/vault-sync.server");
    return pingVault();
  });

export const syncVaultNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertBoss(context);
    const { syncVault } = await import("@/lib/vault-sync.server");
    return syncVault();
  });

/** Store sign-in: only active synced 0G Vault logins get a session. */
export const vaultSignIn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username: z.string().trim().min(1).max(200), password: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const secret = process.env["VAULT_AUTH_SECRET"];
    if (!secret) return { ok: false as const, error: "Sign-in is not set up yet" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyLive, syncVault } = await import("@/lib/vault-sync.server");
    const findRow = async () =>
      (await supabaseAdmin.from("vault_credentials").select("username,password,active")
        .ilike("username", data.username.replace(/[\\%_]/g, "\\$&")).maybeSingle()).data;
    const matches = (r: Awaited<ReturnType<typeof findRow>>) => !!r && r.active && safeEqual(r.password, data.password);

    const live = await verifyLive(data.username, data.password);
    let row = live === false ? null : await findRow();
    if (live === true && !matches(row)) { await syncVault(); row = await findRow(); }

    const openAccount = async (local: string) => {
      const email = `${local}@users.ogvault.app`;
      const authPw = await hmacHex(secret, `auth:${email}`);
      let userId: string | null = null;
      const { data: prof } = await supabaseAdmin.from("profiles").select("id").eq("username", local).maybeSingle();
      if (prof) {
        userId = prof.id;
        await supabaseAdmin.auth.admin.updateUserById(prof.id, { password: authPw });
      } else {
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email, password: authPw, email_confirm: true, user_metadata: { username: local } });
        if (error && !/already/i.test(error.message)) return null;
        userId = created?.user?.id ?? null;
        if (error) {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
          const u = list?.users.find((x) => x.email === email);
          if (u) { userId = u.id; await supabaseAdmin.auth.admin.updateUserById(u.id, { password: authPw }); }
        }
      }
      return { userId, email, authPw };
    };

    // 1) 0G Vault Pass → VIP
    if (live !== false && row && matches(row)) {
      const acc = await openAccount(vaultEmailLocal(row.username));
      if (!acc) return { ok: false as const, error: "Could not open your account" };
      if (acc.userId) {
        const { error: vipErr } = await supabaseAdmin.from("vip_members").upsert({ user_id: acc.userId, expires_at: null, code_id: null }, { onConflict: "user_id" });
        if (vipErr) console.error("[vault] vip grant failed", vipErr.message);
      }
      return { ok: true as const, email: acc.email, token: acc.authPw };
    }

    // 2) Streaming account → Free member (auth only, nothing else from the account is kept)
    const { checkStreamAccount } = await import("@/lib/account-auth.server");
    const account = await checkStreamAccount(data.username.trim(), data.password);
    if (account === "expired") return { ok: false as const, error: "Account expired" };
    if (account === "unreachable") return { ok: false as const, error: "Could not reach the login server, try again" };
    if (account !== "active") return { ok: false as const, error: "Account does not exist or password is wrong" };
    // The "m3u." prefix is part of existing users' account addresses; changing it would orphan them.
    const local = "m3u." + data.username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 60);
    const acc = await openAccount(local);
    if (!acc) return { ok: false as const, error: "Could not open your account" };
    return { ok: true as const, email: acc.email, token: acc.authPw };
  });
