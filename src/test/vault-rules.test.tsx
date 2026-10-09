import { describe, expect, it } from "vitest";
import { canInstall, generateVipCode, isCategoryLocked, usernameError, usernameToEmail, VIP_CODE_PATTERN } from "@/lib/access";
import { pickNext } from "@/lib/spatial-nav";

describe("tier access", () => {
  it("VIP members can install VIP apps", () => expect(canInstall(true, true, "vip")).toBe(true));
  it("regular members cannot install VIP apps", () => expect(canInstall(true, false, "vip")).toBe(false));
  it("regular members can install free apps", () => expect(canInstall(true, false, "free")).toBe(true));
  it("signed-out viewers install nothing", () => expect(canInstall(false, true, "free")).toBe(false));
});

describe("VIP category", () => {
  it("is locked for non-VIP", () => expect(isCategoryLocked({ is_vip: true }, false)).toBe(true));
  it("is open for VIP", () => expect(isCategoryLocked({ is_vip: true }, true)).toBe(false));
  it("normal categories are always open", () => expect(isCategoryLocked({ is_vip: false }, false)).toBe(false));
});

describe("username accounts", () => {
  it("maps username to a sign-in address case-insensitively", () => expect(usernameToEmail(" Faiyaz ")).toBe("faiyaz@users.ogvault.app"));
  it("rejects short usernames", () => expect(usernameError("ab")).not.toBeNull());
  it("rejects spaces", () => expect(usernameError("og user")).not.toBeNull());
  it("accepts valid usernames", () => expect(usernameError("og_user1")).toBeNull());
});

describe("VIP codes", () => {
  it("follow OG-XXXX-XXXX format", () => expect(generateVipCode()).toMatch(VIP_CODE_PATTERN));
});

describe("spatial navigation", () => {
  const from = { x: 0, y: 0, w: 100, h: 100 };
  it("moves right to the nearest tile on the same row", () =>
    expect(pickNext(from, [{ x: 300, y: 0, w: 100, h: 100 }, { x: 120, y: 0, w: 100, h: 100 }], "right")).toBe(1));
  it("moves down to the next row", () => expect(pickNext(from, [{ x: 120, y: 0, w: 100, h: 100 }, { x: 0, y: 200, w: 100, h: 100 }], "down")).toBe(1));
  it("returns -1 at an edge", () => expect(pickNext(from, [{ x: 120, y: 0, w: 100, h: 100 }], "left")).toBe(-1));
});
