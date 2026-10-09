import { createFileRoute } from "@tanstack/react-router";

// Called every 15 min by a scheduled job. Idempotent: only re-pulls from OG BOT Vault.
export const Route = createFileRoute("/api/public/vault-sync-cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!request.headers.get("authorization")?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        try {
          const { syncVault } = await import("@/lib/vault-sync.server");
          const r = await syncVault();
          return Response.json({ ok: true, synced: r.ok });
        } catch (e) {
          console.error("[og-vault-sync] cron failed", e);
          return Response.json({ ok: true, synced: false });
        }
      },
    },
  },
});
