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
- Store users have real accounts: username + password mapped to a synthetic `<username>@users.ogvault.app` address (auto-confirm on, no email delivery) — keeps remote sign-in to two fields.
- App visibility is `apps.audiences` (guest/free/vip), enforced by RLS via `user_level()`: admin > vip > username account (free) > any other Google sign-in (guest). `tier` is derived from audiences for the badge only.
- VIP status is a `vip_members` row (granted by redeeming a code via `redeem_vip_for_me` or by the boss); `is_vip()` is the single check. Categories with `is_vip` render locked for non-VIP.
- vip_codes is admin-only under RLS; codes are redeemed only through security-definer RPCs.
- Playlist (M3U/Xtream) login was removed; `m3u_settings` table and `redeem_vip_code` RPC are unused leftovers.
- Storage buckets are private (workspace blocks public buckets); uploads store long-lived signed URLs on the app row.
- Admin = `user_roles` admin row, auto-granted by signup trigger only to the boss email hard-coded in `handle_first_admin`; auth state lives in `AuthProvider` (`src/hooks/use-auth.tsx`).
- Capacitor native install uses Filesystem.downloadFile + FileOpener with the APK MIME type (`src/lib/native-install.ts`); web falls back to a browser download.
