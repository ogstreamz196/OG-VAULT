package com.ogstreamz.ogvault;

// Native "AdbBridge" Capacitor plugin: phone -> Firestick ADB over Wi-Fi.
// Matches the interface in src/lib/adb-bridge.ts (connect / disconnect / shell).
// Uses the open-source dadb library (dev.mobile:dadb) for the ADB protocol + RSA keys.

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

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
}
