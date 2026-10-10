# 0G VAULT - APP STORE Android app (phone + Firestick, one APK)

The `android/` folder is ready to open in Android Studio — the ADB plugin, dadb library,
permissions, Fire TV banner/launcher and icons are already wired in.

1. Open the `android` folder in Android Studio (needs JDK 21, bundled with recent Studio).
2. Click **Sync Project with Gradle Files**.
3. **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.

The app loads the live store from https://vault.ogstreamz.co.uk, so store changes need no rebuild.
Only rebuild after changing `capacitor.config.ts` or native code (`npx cap sync android` first).

`AdbBridgePlugin.java` here is the master copy; it is also copied into
`android/app/src/main/java/og/vault/`. Keep both in sync.

The Fire TV launcher uses `@drawable/tv_banner` on both the application and
launcher activity. Its 320×180 and 640×360 resources preserve the complete
supplied 16:9 artwork; these must remain real Android resources, not CDN links.
After changing launcher artwork, rebuild and install the APK. Fire TV may cache
the old tile; restart the stick if it remains visible.
