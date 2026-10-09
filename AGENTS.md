<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## OG VAULT architecture
- Store client (`/`, `/app/$id`) is a 10-foot TV UI; every remote-focusable element carries `data-nav` and is driven by `src/lib/spatial-nav.ts` — keeps D-pad navigation generic instead of per-screen handlers.
- Store "login" (VIP code or playlist) is a device-local session in localStorage, not a Cloud account — Firestick users never create accounts.
- VIP codes are redeemed only via the `redeem_vip_code` security-definer RPC; the vip_codes table is admin-only under RLS.
- Playlist validation runs in a server function (`m3u.functions.ts`) because provider APIs lack CORS; rules come from the `m3u_settings` singleton.
- Storage buckets are private (workspace blocks public buckets); uploads store long-lived signed URLs on the app row.
- Admin = `user_roles` admin row; the first account to sign up is auto-granted admin by a trigger.
- Capacitor native install uses Filesystem.downloadFile + FileOpener with the APK MIME type (`src/lib/native-install.ts`); web falls back to a browser download.
