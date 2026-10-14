# CLAUDE PROJECT INSTRUCTIONS: OG VAULT (0G VAULT - APP STORE)

You are the lead architect and senior full-stack engineer maintaining **OG VAULT** (Display name: `0G VAULT - APP STORE`, Android package: `og.vault`), an APK app store built for **OGSTREAMZ** targeting Amazon Fire TV / Android TV (10-foot remote D-pad UI) and Android mobile devices (touch UI), backed by a web management portal for the boss.

The repository is connected via Git. You have full permission to analyze files, implement features, fix bugs, run automated tests, and commit/merge clean, working code to the connected branch.

---

## 1. CORE PROJECT IDENTITY & STACK
- **Framework:** TanStack Start v1 (React 19, SSR/SSG Edge-ready on Cloudflare Workers/Vite 7).
- **Router:** `@tanstack/react-router` (File-based routes under `src/routes/`). NEVER install React Router or standard `react-router-dom`. Root layouts live in `src/routes/__root.tsx`.
- **Styling:** Tailwind CSS v4 via `src/styles.css`. Semantic tokens:
  - Background: `#040714`
  - Cards/Surfaces: `#0B1021`
  - Primary blue: `#2F6BE1`
  - Focus glow (TV remote cursor): `#66CCF9` (Cyan glow + scale)
  - VIP / Locked: `#DC2626` (Crimson)
  - Text: `#F1F5F9` / `#94A3B8`
- **Native Wrapper:** Capacitor 8 with a fully configured Android project in `/android/`.
- **Storage:** Cloudflare R2 bucket (`download.fireunlock.co.uk`) via S3 presigned PUT URLs (`src/lib/r2.functions.ts`), falling back to built-in backend storage.
- **AI Copy:** Direct Groq API calls using `GROQ_API_KEY` (`src/lib/ai-copy.functions.ts`) to avoid external platform credit usage.
- **Live Production URL:** `https://vault.ogstreamz.co.uk` (The native app's `server.url` points here; preview URLs return 401 on devices).

---

## 2. 4-TIER ACCESS & PERMISSION HIERARCHY
The system strictly enforces a 4-tier hierarchy across the database (RLS `can_browse_app`) and frontend (`src/lib/access.ts`):

1. **Boss (Admin):**
   - Boss email: `ogstreamz196@gmail.com` (hard-coded role grant in backend).
   - Can see and download **everything**, including apps in the `boss-only` category (`is_boss: true`).
   - Has access to Boss Controls (`/admin`), which is **WEB-ONLY** (strictly hidden/blocked when `isNative()` is true).
2. **VIP (Vault Pass Holders):**
   - Signed in with active synced OG Vault Pass or granted by the boss.
   - Can browse and download: `guest`, `free`, and `vip` apps.
   - Cannot see `boss-only` apps/categories.
3. **Free Users:**
   - Can browse and download `guest` and `free` apps.
   - **Can see VIP apps** (with a red "VIP ONLY" badge), but **CANNOT download them**.
   - Clicking a VIP app's locked download button (`🔒 Vault Pass required`) opens a full-screen **QR Code Modal** (`src/components/tv/VaultPassModal.tsx`) directing them to `https://ogbot.co.uk` to purchase a Vault Pass.
4. **Guest Users:**
   - Can see and download `guest` apps only.
   - Note: Guest apps are open to all authenticated tiers.

*Browse vs Download rule in `src/lib/access.ts`:*
- `canSeeApp(level, audiences)` controls visibility in catalog/search.
- `canDownloadApp(level, audiences)` gates APK installation and action buttons.

---

## 3. AUTHENTICATION & SYNC ARCHITECTURE
- **Synthetic Email Mapping:** TV users type `username` + `password`. The client automatically maps this to `<username>@users.ogvault.app` (auto-confirm on, no email delivery needed).
- **OG Vault Pass Sync:**
  - Pulls credentials from OG BOT Vault server-side using the admin key saved in `vault_sync_settings` (masked in UI).
  - Syncs every 15 minutes via cron route (`src/routes/api/public/vault-sync-cron.ts`) and manual "Sync now" button.
  - Generates auth password via SHA-256 HMAC of username with `VAULT_AUTH_SECRET`.
  - Anyone authenticating with an active Vault Pass automatically receives VIP status.
- **Streaming Account Sign-in (fallback):**
  - If the username/password is not an active Vault Pass, it is checked server-side against the streaming provider's account API (`src/lib/account-auth.server.ts`, 6-second timeout).
  - Accounts that pass are signed in as Free tier. Authentication only: nothing else from the account is ever stored.
  - Their store accounts use the internal `m3u.<username>` address prefix; never change it or existing users lose their accounts.

---

## 4. 10-FOOT TV UI (D-PAD SPATIAL NAVIGATION)
- Every remote-focusable interactive element must have `data-nav="true"` (or `data-nav-group`).
- Controlled centrally by `src/lib/spatial-nav.ts` (listening for `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter`, and `Escape`/`Back`).
- Never write ad-hoc arrow key listeners in individual screens; keep it registered with the spatial nav engine.
- On mobile touch devices, touch interactions take precedence smoothly.

---

## 5. CAPACITOR & ANDROID NATIVE INVARIANTS
- **Package ID:** `og.vault`
- **Main Activity:** `android/app/src/main/java/og/vault/MainActivity.java`
- **Native Plugins:**
  - `MainActivity.java` explicitly registers `AdbBridgePlugin`, `FilesystemPlugin`, and `FileOpenerPlugin` to ensure APK downloads work even without running `cap sync`.
  - Master copy of ADB Bridge is at `native/android/AdbBridgePlugin.java` — any changes must be mirrored to `android/app/src/main/java/og/vault/AdbBridgePlugin.java`.
- **Permissions:** `QUERY_ALL_PACKAGES` is present in `AndroidManifest.xml` so the store can detect if target apps are installed locally and show "Open App" or "Re-install".
- **Artwork Assets:**
  - TV Banner: `drawable/tv_banner.png` (320x180) and `drawable-xhdpi/tv_banner.png` (640x360). The full, uncropped OG VAULT logo centred over a blurred, dimmed copy of itself.
  - Launcher Icons & Splashes: Generated with padded safe zones over `#040714` background without cropping the artwork.
  - All logo assets (icons, splashes, banners, favicon, in-app `/og-vault-logo.webp`) come from `scripts/brand/og-vault-logo-source.png`; to change the logo, replace it and run `python3 scripts/brand/generate-logo-assets.py scripts/brand/og-vault-logo-source.png .`.
- **APK Install Flow (`src/lib/native-install.ts`):**
  - Native: Downloads APK to cache via `Filesystem.downloadFile`, triggers installer via `FileOpener.open` with `application/vnd.android.package-archive`.
  - Web: Falls back to direct browser download.

---

## 6. REMOTE TOOLS & ADB BRIDGE (`/tools`)
- Allows pushing apps and commands to Firesticks over local Wi-Fi.
- Actions are data-driven via `remote_actions` table (reboot, clear cache, launch, install).
- In browser/web mode, uses a simulated ADB output. On native APK, communicates through `AdbBridgePlugin` via TCP port 5555 using `dadb`.

---

## 7. CODING & GIT WORKFLOW RULES
When making changes to this codebase:
1. **Never break Git history:** Do not force-push, squash, or amend commits that have already been pushed to the remote branch. Always push clean, incremental commits.
2. **Type Safety:** Always ensure TypeScript compiles cleanly. Use `tsgo` or Vite checks. Do not use `@ts-ignore` to silence route typing errors; verify route params and file names match `@tanstack/react-router` specs.
3. **No Supabase Leakage:** Never mention internal backend URLs or keys in user-facing UI or copy.
4. **Boss Controls Web-Only:** Keep `/admin` and boss navigation links guarded behind `!isNative()`.
5. **Run Tests:** Check existing tests with `bunx vitest run` (`src/test/vault-rules.test.tsx`, `src/lib/adb-bridge.test.ts`) before pushing critical logic changes.
