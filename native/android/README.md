# AdbBridge native plugin (phone app)

Turns the Tools page from simulator mode into real Firestick control.

1. `npx cap add android` (once), then `npm run build && npx cap sync android`.
2. Copy `AdbBridgePlugin.java` to `android/app/src/main/java/com/ogstreamz/ogvault/`.
3. In `android/app/build.gradle` dependencies add:
   `implementation "dev.mobile:dadb:1.2.7"`
4. In `MainActivity.java`:
   ```java
   public class MainActivity extends BridgeActivity {
     @Override public void onCreate(Bundle b) { registerPlugin(AdbBridgePlugin.class); super.onCreate(b); }
   }
   ```
5. `AndroidManifest.xml` already has INTERNET; also add
   `<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>`.
6. Build the APK in Android Studio, install on the phone, open Tools, enter the Firestick IP, Connect, accept the prompt on the TV (tick "Always allow").

## New in this version
- `install` (Send to Firestick), `scan` (Wi-Fi auto-find), `launchApp`, `openAppSettings`.
- Needs `<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />` and `INTERNET` in AndroidManifest.xml.
