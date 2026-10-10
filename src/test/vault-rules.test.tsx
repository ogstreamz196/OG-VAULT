import { describe, expect, it } from "vitest";
import { canSeeApp, tierFromAudiences, generateVipCode, isCategoryLocked, usernameError, usernameToEmail, VIP_CODE_PATTERN } from "@/lib/access";
import { pickNext } from "@/lib/spatial-nav";

describe("app audiences", () => {
  it("guests see only guest-listed apps", () => {
    expect(canSeeApp("guest", ["guest"])).toBe(true);
    expect(canSeeApp("guest", ["free", "vip"])).toBe(false);
  });
  it("free members cannot see VIP-only apps", () => expect(canSeeApp("free", ["vip"])).toBe(false));
  it("VIP members see VIP apps", () => expect(canSeeApp("vip", ["vip"])).toBe(true));
  it("the boss sees everything", () => expect(canSeeApp("admin", [])).toBe(true));
  it("signed-out viewers see nothing", () => expect(canSeeApp("none", ["guest", "free", "vip"])).toBe(false));
  it("VIP-only apps get the VIP badge", () => {
    expect(tierFromAudiences(["vip"])).toBe("vip");
    expect(tierFromAudiences(["free", "vip"])).toBe("free");
  });
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

import { appsForCategory as afc } from "@/lib/access";
describe("VIP section", () => {
  const vipCat = { id: "v", is_vip: true }, media = { id: "m", is_vip: false };
  const apps = [{ id: "1", category_id: "m", audiences: ["vip"] }, { id: "2", category_id: "m", audiences: ["free", "vip"] }];
  it("VIP-only apps appear in the VIP section and their chosen category", () => {
    expect(afc(apps, vipCat).map((a) => a.id)).toEqual(["1"]);
    expect(afc(apps, media).map((a) => a.id)).toEqual(["1", "2"]);
  });
});
