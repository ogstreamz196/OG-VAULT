import { describe, expect, it } from "vitest";
import { canInstall, generateVipCode, VIP_CODE_PATTERN } from "@/lib/vault-session";
import { evaluateXtream, hostAllowed, toXtream, type M3uRules } from "@/lib/m3u";
import { pickNext } from "@/lib/spatial-nav";

const rules: M3uRules = { enabled: true, require_active_status: true, reject_expired: true, allowed_hosts: [], min_connections: 0, timeout_ms: 8000 };

describe("tier access", () => {
  it("VIP code unlocks VIP apps", () => expect(canInstall({ kind: "vip", code: "x", expiresAt: null }, "vip")).toBe(true));
  it("playlist login cannot install VIP apps", () => expect(canInstall({ kind: "playlist", label: "x", expiresAt: null }, "vip")).toBe(false));
  it("playlist login unlocks free apps", () => expect(canInstall({ kind: "playlist", label: "x", expiresAt: null }, "free")).toBe(true));
  it("no session installs nothing", () => expect(canInstall(null, "free")).toBe(false));
});

describe("VIP codes", () => {
  it("follow OG-XXXX-XXXX format", () => expect(generateVipCode()).toMatch(VIP_CODE_PATTERN));
});

describe("playlist verification", () => {
  it("rejects expired subscriptions", () => expect(evaluateXtream({ auth: 1, status: "Active", exp_date: "1000" }, rules, 2000).ok).toBe(false));
  it("rejects inactive accounts", () => expect(evaluateXtream({ auth: 1, status: "Banned" }, rules).ok).toBe(false));
  it("accepts an active account", () => expect(evaluateXtream({ auth: 1, status: "Active", exp_date: "3000" }, rules, 2000).ok).toBe(true));
  it("enforces allowed hosts", () => {
    expect(hostAllowed("http://evil.com", ["good.com"])).toBe(false);
    expect(hostAllowed("http://tv.good.com:8080", ["good.com"])).toBe(true);
  });
  it("extracts xtream creds from get.php links", () =>
    expect(toXtream({ mode: "m3u", url: "http://h.com:80/get.php?username=a&password=b&type=m3u" })).toEqual({ server: "http://h.com", username: "a", password: "b" }));
});

describe("spatial navigation", () => {
  const from = { x: 0, y: 0, w: 100, h: 100 };
  it("moves right to the nearest tile on the same row", () =>
    expect(pickNext(from, [{ x: 300, y: 0, w: 100, h: 100 }, { x: 120, y: 0, w: 100, h: 100 }, { x: 120, y: 300, w: 100, h: 100 }], "right")).toBe(1));
  it("moves down to the next row", () => expect(pickNext(from, [{ x: 120, y: 0, w: 100, h: 100 }, { x: 0, y: 200, w: 100, h: 100 }], "down")).toBe(1));
  it("returns -1 at an edge", () => expect(pickNext(from, [{ x: 120, y: 0, w: 100, h: 100 }], "left")).toBe(-1));
});
