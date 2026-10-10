package og.vault;

// Native "AdbBridge" Capacitor plugin: phone -> Firestick ADB over Wi-Fi.
// Matches the interface in src/lib/adb-bridge.ts.
// Uses the open-source dadb library (dev.mobile:dadb) for the ADB protocol + RSA keys.

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import dadb.AdbKeyPair;
import dadb.AdbShellResponse;
import dadb.Dadb;

@CapacitorPlugin(name = "AdbBridge")
public class AdbBridgePlugin extends Plugin {
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private Dadb dadb;

    private AdbKeyPair keys() throws Exception {
        File priv = new File(getContext().getFilesDir(), "adbkey");
        File pub = new File(getContext().getFilesDir(), "adbkey.pub");
        // A stable key means the TV's "Always allow" choice is remembered.
        if (!priv.exists() || !pub.exists()) AdbKeyPair.generate(priv, pub);
        return AdbKeyPair.read(priv, pub);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String host = call.getString("host");
        int port = call.getInt("port", 5555);
        io.execute(() -> {
            try {
                if (dadb != null) { try { dadb.close(); } catch (Exception ignored) {} }
                dadb = Dadb.create(host, port, keys());
                dadb.shell("echo ok"); // forces auth; TV shows "Allow USB debugging?"
                JSObject r = new JSObject(); r.put("connected", true); call.resolve(r);
            } catch (Exception e) { dadb = null; call.reject("Could not connect: " + e.getMessage()); }
        });
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        io.execute(() -> {
            try { if (dadb != null) dadb.close(); } catch (Exception ignored) {}
            dadb = null; call.resolve();
        });
    }

    @PluginMethod
    public void shell(PluginCall call) {
        String command = call.getString("command");
        io.execute(() -> {
            if (dadb == null) { call.reject("Not connected"); return; }
            try {
                AdbShellResponse res = dadb.shell(command);
                JSObject r = new JSObject(); r.put("output", res.getAllOutput().trim()); call.resolve(r);
            } catch (Exception e) { call.reject("Command failed: " + e.getMessage()); }
        });
    }

    private void progress(String stage, int pct) {
        JSObject d = new JSObject(); d.put("stage", stage); d.put("pct", pct);
        notifyListeners("installProgress", d);
    }

    /** Downloads the APK to the phone cache, then installs it on the connected Firestick. */
    @PluginMethod
    public void install(PluginCall call) {
        String url = call.getString("url");
        io.execute(() -> {
            if (dadb == null) { call.reject("Not connected"); return; }
            File apk = new File(getContext().getCacheDir(), "push.apk");
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setInstanceFollowRedirects(true);
                long total = c.getContentLengthLong(); long got = 0; int last = -1;
                try (InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(apk)) {
                    byte[] buf = new byte[64 * 1024]; int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n); got += n;
                        int pct = total > 0 ? (int) (got * 100 / total) : 50;
                        if (pct != last) { progress("download", pct); last = pct; }
                    }
                }
                progress("download", 100);
                progress("push", 10);
                dadb.install(apk); // streams the APK and runs pm install -r
                progress("push", 100);
                JSObject r = new JSObject(); r.put("output", "Success"); call.resolve(r);
            } catch (Exception e) {
                call.reject("Install failed: " + e.getMessage());
            } finally { apk.delete(); }
        });
    }

    /** Sweeps the phone's /24 Wi-Fi subnet for open ADB ports. */
    @PluginMethod
    public void scan(PluginCall call) {
        int port = call.getInt("port", 5555);
        new Thread(() -> {
            try {
                WifiManager wm = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                int ip = wm.getConnectionInfo().getIpAddress();
                if (ip == 0) { call.reject("Connect your phone to Wi-Fi first"); return; }
                String base = (ip & 0xff) + "." + ((ip >> 8) & 0xff) + "." + ((ip >> 16) & 0xff) + ".";
                List<String> found = Collections.synchronizedList(new ArrayList<>());
                ExecutorService pool = Executors.newFixedThreadPool(32);
                for (int i = 1; i < 255; i++) {
                    String host = base + i;
                    pool.execute(() -> {
                        try (Socket s = new Socket()) { s.connect(new InetSocketAddress(host, port), 300); found.add(host); }
                        catch (Exception ignored) {}
                    });
                }
                pool.shutdown(); pool.awaitTermination(15, TimeUnit.SECONDS);
                JSArray arr = new JSArray(); for (String h : found) arr.put(h);
                JSObject r = new JSObject(); r.put("hosts", arr); call.resolve(r);
            } catch (Exception e) { call.reject("Scan failed: " + e.getMessage()); }
        }).start();
    }

    @PluginMethod
    public void launchApp(PluginCall call) {
        Intent i = getContext().getPackageManager().getLaunchIntentForPackage(call.getString("package"));
        if (i == null) { call.reject("App is not installed"); return; }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); getContext().startActivity(i); call.resolve();
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + call.getString("package")));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); getContext().startActivity(i); call.resolve();
    }
}
