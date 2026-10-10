import { describe, it, expect } from "vitest";
import { buildCommand, isValidHost } from "./adb-bridge";

describe("adb bridge", () => {
  it("fills package placeholder", () => expect(buildCommand("pm clear {package}", "org.xbmc.kodi")).toBe("pm clear org.xbmc.kodi"));
  it("rejects injected package", () => expect(() => buildCommand("pm clear {package}", "a.b; reboot")).toThrow());
  it("requires package when needed", () => expect(() => buildCommand("am force-stop {package}")).toThrow());
  it("validates IPs", () => { expect(isValidHost("192.168.1.45")).toBe(true); expect(isValidHost("999.1.1.1")).toBe(false); });
});

import { adbInstall as _install, isValidPackage as _pkg } from "./adb-bridge";
import { it as _it, expect as _expect } from "vitest";
_it("refuses to push an APK before a Firestick is connected", async () => {
  await _expect(_install("https://x/a.apk", () => {})).rejects.toThrow(/Connect/);
});
_it("rejects package names that could chain commands", () => {
  _expect(_pkg("com.app; reboot")).toBe(false);
  _expect(_pkg("org.xbmc.kodi")).toBe(true);
});
