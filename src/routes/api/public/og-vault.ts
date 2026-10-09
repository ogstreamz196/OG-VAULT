import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { hmacHex, safeEqual, timestampFresh } from "@/lib/vault-crypto";

const Body = z.object({
  event: z.enum(["vault_credential.created", "vault_credential.updated", "vault_credential.deleted", "vault.ping"]),
  timestamp: z.number(),
  data: z
    .object({
      id: z.union([z.string(), z.number()]).optional().nullable(),
      username: z.string().max(200).optional().nullable(),
      password: z.string().max(500).optional().nullable(),
      note: z.string().max(2000).optional().nullable(),
      active: z.boolean().optional().nullable(),
    })
    .partial()
    .optional()
    .nullable(),
});

const unauthorized = () => Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

export const Route = createFileRoute("/api/public/og-vault")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["OG_VAULT_WEBHOOK_SECRET"];
        if (!secret) return unauthorized();
        const raw = await request.text();

        const auth = request.headers.get("authorization") ?? "";
        const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        const sigHeader = request.headers.get("x-og-signature") ?? "";
        const sig = sigHeader.startsWith("sha256=") ? sigHeader.slice(7).toLowerCase() : "";
        const expected = await hmacHex(secret, raw);
        const bearerOk = safeEqual(bearer, secret);
        const sigOk = safeEqual(sig, expected);
        if (!bearerOk || !sigOk) return unauthorized();

        let parsed;
        try { parsed = Body.safeParse(JSON.parse(raw)); } catch { return Response.json({ ok: false, error: "bad json" }, { status: 400 }); }
        if (!parsed.success) return Response.json({ ok: false, error: "bad payload" }, { status: 400 });
        const { event, timestamp, data } = parsed.data;
        if (!timestampFresh(timestamp)) return unauthorized();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();

        if (event === "vault.ping") {
          await supabaseAdmin.from("vault_sync_meta").upsert({ id: 1, last_ping_at: now });
          return Response.json({ ok: true, verified: true });
        }

        const username = data?.username?.trim();
        if (!username) return Response.json({ ok: false, error: "username required" }, { status: 400 });

        const { data: existing } = await supabaseAdmin.from("vault_credentials").select("id").ilike("username", username.replace(/[\\%_]/g, "\\$&")).maybeSingle();

        if (event === "vault_credential.deleted") {
          if (existing) await supabaseAdmin.from("vault_credentials").update({ active: false, updated_at: now }).eq("id", existing.id);
        } else {
          const row = {
            username,
            password: data?.password ?? "",
            note: data?.note ?? "",
            active: data?.active ?? true,
            external_id: data?.id != null ? String(data.id) : null,
            updated_at: now,
          };
          if (existing) await supabaseAdmin.from("vault_credentials").update(row).eq("id", existing.id);
          else await supabaseAdmin.from("vault_credentials").insert(row);
        }
        await supabaseAdmin.from("vault_sync_meta").upsert({ id: 1, last_event_at: now });
        return Response.json({ ok: true });
      },
    },
  },
});
