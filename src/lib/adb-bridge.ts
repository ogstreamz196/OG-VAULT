// Phone → Firestick ADB bridge. Uses a native Capacitor plugin "AdbBridge" when the
// Android app ships it; otherwise runs a simulator so the UI works in the browser.
import { Capacitor, registerPlugin } from "@capacitor/core";

interface AdbBridgePlugin {
  connect(o: { host: string; port: number }): Promise<{ connected: boolean }>;
  disconnect(): Promise<void>;
  shell(o: { command: string }): Promise<{ output: string }>;
}

const Native = registerPlugin<AdbBridgePlugin>("AdbBridge");

export const isNativeAdb = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("AdbBridge");

/** Fills {package} and rejects anything that could chain extra commands. */
export function buildCommand(template: string, pkg?: string): string {
  if (template.includes("{package}")) {
    if (!pkg || !/^[a-zA-Z][\w]*(\.[\w]+)+$/.test(pkg)) throw new Error("Pick a valid app package first");
    return template.split("{package}").join(pkg);
  }
  return template;
}

export const isValidHost = (h: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(h) && h.split(".").every((n) => +n <= 255);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function simulate(cmd: string): string {
  if (cmd.startsWith("df")) return "Filesystem  Size  Used Avail Use% Mounted on\n/data       5.4G  3.1G  2.3G  58% /data";
  if (cmd.startsWith("pm clear")) return "Success";
  if (cmd.startsWith("pm trim-caches")) return "Caches trimmed (≈412 MB freed)";
  if (cmd.startsWith("pm list packages")) return "package:com.ogstreamz.ogvault\npackage:org.xbmc.kodi\npackage:com.netflix.ninja";
  if (cmd === "reboot") return "Reboot command sent";
  return "OK";
}

export async function adbConnect(host: string, port: number) {
  if (isNativeAdb()) return (await Native.connect({ host, port })).connected;
  await sleep(900);
  return true;
}
export async function adbDisconnect() {
  if (isNativeAdb()) await Native.disconnect();
}
export async function adbShell(command: string): Promise<string> {
  if (isNativeAdb()) return (await Native.shell({ command })).output;
  await sleep(600);
  return `[simulator] ${simulate(command)}`;
}
