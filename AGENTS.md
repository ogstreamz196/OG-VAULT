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
- App visibility is `apps.audiences` (guest/free/vip/boss) enforced by RLS via `can_browse_app()`; browse vs download split in `src/lib/access.ts` (canSeeApp / canDownloadApp). Categories with `is_boss` are hidden from non-admins — keeps one source of truth per tier.
- VIP status is a `vip_members` row (granted by redeeming a code via `redeem_vip_for_me` or by the boss); `is_vip()` is the single check. Categories with `is_vip` render locked for non-VIP.
- vip_codes is admin-only under RLS; codes are redeemed only through security-definer RPCs.
- Playlist (M3U/Xtream) login was removed; `m3u_settings` table and `redeem_vip_code` RPC are unused leftovers.
- Storage buckets are private (workspace blocks public buckets); uploads store long-lived signed URLs on the app row.
- Admin = `user_roles` admin row, auto-granted by signup trigger only to the boss email hard-coded in `handle_first_admin`; auth state lives in `AuthProvider` (`src/hooks/use-auth.tsx`).
- Capacitor native install uses Filesystem.downloadFile + FileOpener with the APK MIME type (`src/lib/native-install.ts`); web falls back to a browser download.

- OG Vault logins are pulled server-side from OG BOT Vault with an admin-saved API key in `vault_sync_settings` (service-role only; browser sees a masked key), every 15 min via cron route + "Sync now"; sign-in requires an active synced row (optional live verify) and derives the auth password from VAULT_AUTH_SECRET — failures never block the app.
- Uploads go to Cloudflare R2 (settings in `storage_settings`, service-role only) when enabled; browser PUTs to a server-presigned URL so large APKs skip the worker. Falls back to built-in storage.
- AI store-copy generation calls Groq directly with the boss's GROQ_API_KEY (`src/lib/ai-copy.functions.ts`, admin-checked) — user chose not to spend Lovable credits.
- Install/update state is a device-local ledger (`src/lib/installed.ts`) compared by build_number — no server tracking needed.
- Phone ADB tools: `/tools` runs admin-defined `remote_actions` via `src/lib/adb-bridge.ts` (native AdbBridge plugin if present, else simulator) — buttons are data, not code.
- The android/ Capacitor project is committed pre-configured (AdbBridge plugin registered, dadb dependency, leanback + touch optional, Fire TV banner) so the user only syncs/builds in Android Studio; native/android/AdbBridgePlugin.java is the master copy and must match the android/ copy.
- Fire TV launcher banners are packaged as native drawable resources in baseline and xhdpi sizes and referenced by both the application and launcher activity — the home screen must work without fetching CDN artwork.
- All launcher icons (legacy + adaptive foreground), splash screens, favicon and PWA icon are generated from the user's supplied vault artwork: legacy icons full-bleed on black, adaptive foregrounds inside the 66/108 safe zone with black artwork pixels made transparent (tile color #040714), splashes screen-blended over #040714 — no cropping of the artwork.
- The native app's server.url points at the published custom domain — the preview URL is private and returns 401 on devices.
- Boss Controls are web-only: the header link and `/admin` are hidden/blocked when `isNative()` is true — the boss manages the store from a browser, never from the APK.
- Store-wide announcement is the single-row `store_broadcast` table (public read, admin write), rendered by `BroadcastBar` under `StoreHeader`.
