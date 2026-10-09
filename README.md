# Fire App Vault

Build OG VAULT for brand OGSTREAMZ: an APK app store designed for Firestick distribution (to be wrapped with Capacitor into an Android APK) with an Admin Management Portal.

Color scheme extracted from brand:
- Background / Canvas: Midnight Void #040714
- Cards / Surfaces: Dark Obsidian Glass #0B1021 with glowing borders
- Primary Brand: Electric Blue #2F6BE1
- Focus Ring / Accent Glow: Cyan Flame #66CCF9
- VIP Tier / Danger Accent: Crimson Red #DC2626
- Text Primary: Chrome Silver #F1F5F9
- Text Secondary: Steel Blue #94A3B8

Key Features:
1. TV Store Client (10-foot UI optimized for Firestick remote / D-Pad spatial navigation):
   - Spatial navigation with ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter, Back / Escape
   - Focused elements feature high-contrast Cyan Flame (#66CCF9) glow and subtle scaling
   - Home screen with:
     * Featured Apps carousel / hero banner
     * Recently Added row
     * Dynamic Category rows (e.g. Media, Live TV, Tools, Utilities)
   - App Detail Modal / Screen:
     * App title, version, build number, category, tier badge (Free vs VIP)
     * Full description and changelog
     * Multiple preview screenshots gallery
     * Download / Install APK action (with download progress state and Capacitor Filesystem / Android Package Installer integration preparation)
   - Remote-friendly Login Gate:
     * VIP Access Code entry (e.g., OG-XXXX-XXXX)
     * M3U / Xtream playlist login (Server URL, Username, Password or M3U link) to unlock free-tier apps

2. Admin Management Portal (/admin):
   - App Catalog Manager: Add, edit, and delete apps. Update title, package name, version, build number, description, changelog, tier (Free vs VIP), and active status.
   - Screenshots & Media Manager: Upload / configure app icons, hero banners, and multiple preview screenshots.
   - APK Uploads: Direct file upload for .apk files into storage, or direct URL input for external CDNs / hosting.
   - Category Manager: Add, edit, reorder, and remove app categories easily.
   - VIP Code Generator: Create, manage, expire, and revoke VIP access codes with device limits.
   - M3U Verification Settings: Configurable M3U/Xtream validation rules.

3. Capacitor & Firestick Readiness:
   - Include capacitor.config.ts configured for package name com.ogstreamz.ogvault and app name "OG VAULT".
   - Helper utility to trigger native download and package installation intent when running in Capacitor.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fire-app-vault.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a5726f94-a9dd-489f-bd5c-00df653e48fc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
