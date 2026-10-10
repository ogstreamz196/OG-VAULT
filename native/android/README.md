# 0G VAULT - APP STORE Android app (phone + Firestick, one APK)

The `android/` folder is ready to open in Android Studio — the ADB plugin, dadb library,
permissions, Fire TV banner/launcher and icons are already wired in.

1. Open the `android` folder in Android Studio (needs JDK 21, bundled with recent Studio).
2. Click **Sync Project with Gradle Files**.
3. **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.

The app loads the live store from https://vault.ogstreamz.co.uk, so store changes need no rebuild.
Only rebuild after changing `capacitor.config.ts` or native code (`npx cap sync android` first).

`AdbBridgePlugin.java` here is the master copy; it is also copied into
`android/app/src/main/java/com/ogstreamz/ogvault/`. Keep both in sync.
