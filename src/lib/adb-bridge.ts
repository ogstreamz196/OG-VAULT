// Phone → Firestick ADB bridge. Uses a native Capacitor plugin "AdbBridge" when the
// Android app ships it; otherwise runs a simulator so the UI works in the browser.
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

interface AdbBridgePlugin {
  connect(o: { host: string; port: number }): Promise<{ connected: boolean }>;
  disconnect(): Promise<void>;
  shell(o: { command: string }): Promise<{ output: string }>;
  install(o: { url: string }): Promise<{ output: string }>;
  scan(o: { port: number }): Promise<{ hosts: string[] }>;
  launchApp(o: { package: string }): Promise<void>;
  openAppSettings(o: { package: string }): Promise<void>;
  addListener(e: "installProgress", cb: (d: { stage: "download" | "push"; pct: number }) => void): Promise<PluginListenerHandle>;
}

const Native = registerPlugin<AdbBridgePlugin>("AdbBridge");

export const isNativeAdb = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("AdbBridge");

/** Fills {package} and rejects anything that could chain extra commands. */
export function buildCommand(template: string, pkg?: string): string {
  if (template.includes("{package}")) {
    if (!pkg || !isValidPackage(pkg)) throw new Error("Pick a valid app package first");
    return template.split("{package}").join(pkg);
  }
  return template;
}

export const isValidPackage = (p: string) => /^[a-zA-Z][\w]*(\.[\w]+)+$/.test(p);
export const isValidHost = (h: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(h) && h.split(".").every((n) => +n <= 255);

const HOST_KEY = "ogvault.adbHost";
export const savedHost = () => (typeof window === "undefined" ? "" : localStorage.getItem(HOST_KEY) ?? "");
export const saveHost = (h: string) => localStorage.setItem(HOST_KEY, h);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function simulate(cmd: string): string {
  if (cmd.startsWith("df")) return "Filesystem  Size  Used Avail Use% Mounted on\n/data       5.4G  3.1G  2.3G  58% /data";
  if (cmd.startsWith("pm clear")) return "Success";
  if (cmd.startsWith("pm trim-caches")) return "Caches trimmed (≈412 MB freed)";
  if (cmd.startsWith("pm list packages")) return "package:com.ogstreamz.ogvault\npackage:org.xbmc.kodi\npackage:com.netflix.ninja";
  if (cmd === "reboot") return "Reboot command sent";
  return "OK";
}

let connectedHost: string | null = null;
export const isConnected = () => connectedHost !== null;

export async function adbConnect(host: string, port: number) {
  const ok = isNativeAdb() ? (await Native.connect({ host, port })).connected : (await sleep(900), true);
  connectedHost = ok ? host : null;
  return ok;
}
export async function adbDisconnect() {
  if (isNativeAdb()) await Native.disconnect();
  connectedHost = null;
}
export async function adbShell(command: string): Promise<string> {
  if (isNativeAdb()) return (await Native.shell({ command })).output;
  await sleep(600);
  return `[simulator] ${simulate(command)}`;
}

/** Sweeps the phone's Wi-Fi subnet for devices with ADB (port 5555) open. */
export async function adbScan(): Promise<string[]> {
  if (isNativeAdb()) return (await Native.scan({ port: 5555 })).hosts;
  await sleep(1500);
  return ["192.168.1.45"];
}

export type PushStage = "download" | "push";
/** Phone downloads the APK, then installs it on the connected Firestick (pm install -r). */
export async function adbInstall(url: string, onProgress: (stage: PushStage, pct: number) => void): Promise<string> {
  if (!connectedHost) throw new Error("Connect to your Firestick first");
  if (isNativeAdb()) {
    const l = await Native.addListener("installProgress", (d) => onProgress(d.stage, d.pct));
    try { return (await Native.install({ url })).output; } finally { await l.remove(); }
  }
  for (const stage of ["download", "push"] as const)
    for (let p = 0; p <= 100; p += 20) { onProgress(stage, p); await sleep(200); }
  return "[simulator] Success";
}

/** Opens an installed app on this device (native only). */
export async function launchLocalApp(pkg: string) {
  if (!isNativeAdb()) throw new Error("Open the app from your Firestick home screen");
  await Native.launchApp({ package: pkg });
}
/** Opens Fire OS / Android settings page for an app (clear cache, force stop, uninstall). */
export async function openLocalAppSettings(pkg: string) {
  if (!isNativeAdb()) throw new Error("Go to Settings → Applications → Manage Installed Applications");
  await Native.openAppSettings({ package: pkg });
}
