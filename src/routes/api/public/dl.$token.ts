import { createFileRoute } from "@tanstack/react-router";
import { apkFileName, readPhoneLinkToken } from "@/lib/phone-link";
import { canDownloadApp, type Level } from "@/lib/access";

// Scanned from the TV's "Download to my Android phone" QR code. Decrypts the link, re-checks the
// app and the user's access, then streams the APK as a download so the phone starts it straight
// away. The real file URL never appears in the link.
export const Route = createFileRoute("/api/public/dl/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { phoneLinkSecret } = await import("@/lib/phone-link.functions");
        const secret = phoneLinkSecret();
        if (!secret) return page(503, "Downloads are unavailable", "Phone downloads aren't set up yet. Try again later.");

        const link = await readPhoneLinkToken(params.token, secret);
        if (!link.ok) {
          return link.reason === "expired"
            ? page(410, "This link has expired", "Open the app on your TV again and scan the new QR code.")
            : page(404, "Link not recognised", "Scan the QR code shown on your TV to download the app.");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { appId, userId } = link.payload;
        const { data: app } = await supabaseAdmin.from("apps").select("id, title, version, apk_url, is_active, audiences").eq("id", appId).maybeSingle();
        if (!app || !app.is_active || !app.apk_url) return page(404, "App not available", "This app has been removed or has no download yet.");
        const { data: level } = await supabaseAdmin.rpc("user_level", { _user_id: userId });
        if (!canDownloadApp(((level as string | null) ?? "guest") as Level, app.audiences)) return page(403, "Download locked", "Your account can't download this app.");

        let upstream: Response;
        try {
          upstream = await fetch(app.apk_url);
        } catch {
          return page(502, "Download failed", "The file couldn't be reached. Please try again.");
        }
        if (!upstream.ok || !upstream.body) return page(502, "Download failed", "The file couldn't be reached. Please try again.");

        void supabaseAdmin.from("app_install_events").insert({ app_id: app.id, user_id: userId, event_type: "download_started", platform: "phone-qr" }).then(() => {}, () => {});

        const headers = new Headers({
          "Content-Type": "application/vnd.android.package-archive",
          "Content-Disposition": `attachment; filename="${apkFileName(app.title, app.version)}"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "no-referrer",
        });
        const length = upstream.headers.get("content-length");
        if (length) headers.set("Content-Length", length);
        return new Response(upstream.body, { status: 200, headers });
      },
    },
  },
});

function page(status: number, title: string, message: string): Response {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — 0G VAULT</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#040714;color:#f1f5f9;font-family:system-ui,sans-serif;text-align:center;padding:24px;box-sizing:border-box}
h1{font-size:1.4rem;margin:0 0 .5rem}p{color:#94a3b8;margin:0;max-width:22rem;line-height:1.5}</style></head>
<body><main><h1>${esc(title)}</h1><p>${esc(message)}</p></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
