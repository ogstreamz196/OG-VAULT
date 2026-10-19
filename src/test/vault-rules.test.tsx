import { describe, expect, it } from "vitest";
import { canSeeApp, canDownloadApp, tierFromAudiences, generateVipCode, isCategoryLocked, usernameError, usernameToEmail, VIP_CODE_PATTERN, placeAppInCategory, appCategoryError } from "@/lib/access";
import { pickNext } from "@/lib/spatial-nav";

describe("app audiences", () => {
  it("guests see only guest-listed apps", () => {
    expect(canSeeApp("guest", ["guest"])).toBe(true);
    expect(canSeeApp("guest", ["free", "vip"])).toBe(false);
  });
  it("free members see VIP apps but cannot download them", () => {
    expect(canSeeApp("free", ["vip"])).toBe(true);
    expect(canDownloadApp("free", ["vip"])).toBe(false);
  });
  it("everyone signed in sees and downloads guest apps", () => {
    for (const l of ["guest", "free", "vip", "admin"] as const) expect(canDownloadApp(l, ["guest"])).toBe(true);
  });
  it("VIP members download VIP, free and guest apps", () => {
    for (const a of ["vip", "free", "guest"]) expect(canDownloadApp("vip", [a])).toBe(true);
  });
  it("only the boss sees boss-only apps", () => {
    expect(canSeeApp("vip", ["boss"])).toBe(false);
    expect(canDownloadApp("admin", ["boss"])).toBe(true);
  });
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

describe("mandatory private category placement", () => {
  const categories = [{ id: "public", is_boss: false }, { id: "boss", is_boss: true }, { id: "boss-2", is_boss: true }];
  it("automatically files boss-only apps in a boss category", () => {
    expect(placeAppInCategory(["boss"], null, categories)).toEqual({ audiences: ["boss"], category_id: "boss" });
    expect(placeAppInCategory(["boss"], "public", categories).category_id).toBe("boss");
    expect(placeAppInCategory(["boss"], "boss-2", categories).category_id).toBe("boss-2");
  });
  it("requires an existing category for every app", () => {
    expect(appCategoryError(null, categories)).not.toBeNull();
    expect(appCategoryError("missing", categories)).not.toBeNull();
    expect(appCategoryError("public", categories)).toBeNull();
  });
  it("makes apps placed in a boss category exclusively boss-only", () => {
    expect(placeAppInCategory(["free", "vip"], "boss", categories)).toEqual({ audiences: ["boss"], category_id: "boss" });
  });
  it("never lets guest, free or VIP members see or download boss-only apps", () => {
    for (const level of ["none", "guest", "free", "vip"] as const) {
      expect(canSeeApp(level, ["boss"])).toBe(false);
      expect(canDownloadApp(level, ["boss"])).toBe(false);
    }
  });
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
  it("moves up to the banner button above a tile instead of skipping to the header", () => {
    const tile = { x: 400, y: 400, w: 160, h: 200 };
    const header = { x: 420, y: 10, w: 80, h: 30 };
    const heroButton = { x: 60, y: 300, w: 120, h: 40 };
    expect(pickNext(tile, [header, heroButton], "up")).toBe(1);
  });
  it("stays on the same row when moving right", () => {
    const tile = { x: 0, y: 100, w: 100, h: 100 };
    const below = { x: 110, y: 205, w: 100, h: 100 };
    const sameRow = { x: 400, y: 100, w: 100, h: 100 };
    expect(pickNext(tile, [below, sameRow], "right")).toBe(1);
  });
});

import { appsForCategory as afc } from "@/lib/access";
describe("VIP section", () => {
  const vipCat = { id: "v", is_vip: true }, media = { id: "m", is_vip: false };
  const apps = [{ id: "1", category_id: "m", audiences: ["vip"] }, { id: "2", category_id: "m", audiences: ["free", "vip"] }];
  it("VIP-only apps appear in the VIP section and their chosen category", () => {
    expect(afc(apps, vipCat).map((a) => a.id)).toEqual(["1"]);
    expect(afc(apps, media).map((a) => a.id)).toEqual(["1", "2"]);
  });
  it("lists the VIP category's own apps first, then VIP apps from other categories", () => {
    const mixed = [{ id: "x", category_id: "m", audiences: ["vip"] }, { id: "own", category_id: "v", audiences: ["vip"] }];
    expect(afc(mixed, vipCat).map((a) => a.id)).toEqual(["own", "x"]);
  });
});

import { installState } from "@/lib/installed";
describe("install state from the device", () => {
  const app = { id: "a", build_number: 12 };
  it("flags an update when the catalog build is newer than the installed versionCode", () =>
    expect(installState(app, {}, { installed: true, versionCode: 11, versionName: "1.1" })).toBe("update"));
  it("is installed when the device already has this build or newer", () =>
    expect(installState(app, {}, { installed: true, versionCode: 12, versionName: "1.2" })).toBe("installed"));
  it("ignores a stale ledger entry when the device says the app is gone", () =>
    expect(installState(app, { a: { version: "1.0", build: 3, at: 0 } }, { installed: false, versionCode: 0, versionName: "" })).toBe("none"));
  it("falls back to the ledger when the device can't answer", () =>
    expect(installState(app, { a: { version: "1.0", build: 3, at: 0 } }, null)).toBe("update"));
});

import { isStoreUpdateAvailable } from "@/lib/store-release";
describe("store self-update", () => {
  const release = { build_number: 3, apk_url: "https://example.com/og.vault.apk" };
  it("offers a newer published build", () => expect(isStoreUpdateAvailable(release, 2)).toBe(true));
  it("stays quiet on the same or a newer build", () => expect(isStoreUpdateAvailable(release, 3)).toBe(false));
  it("never offers an update in the browser", () => expect(isStoreUpdateAvailable(release, null)).toBe(false));
  it("needs an APK to install", () => expect(isStoreUpdateAvailable({ build_number: 3, apk_url: null }, 1)).toBe(false));
});

import { byCategoryOrder, moveInCategory } from "@/lib/app-order";
describe("app order inside a category", () => {
  const apps = [
    { id: "a", sort_order: 1, created_at: "2026-01-03" },
    { id: "b", sort_order: 2, created_at: "2026-01-02" },
    { id: "c", sort_order: 3, created_at: "2026-01-01" },
  ];
  it("moves an app up by swapping it with the one above", () =>
    expect(moveInCategory(apps, 1, -1)).toEqual([{ id: "b", sort_order: 1 }, { id: "a", sort_order: 2 }]));
  it("does nothing past either end", () => {
    expect(moveInCategory(apps, 0, -1)).toEqual([]);
    expect(moveInCategory(apps, 2, 1)).toEqual([]);
  });
  it("still moves apps that share the default order", () => {
    const fresh = apps.map((a) => ({ ...a, sort_order: 0 }));
    expect(byCategoryOrder(fresh).map((a) => a.id)).toEqual(["a", "b", "c"]);
    const writes = moveInCategory(fresh, 2, -1);
    const order = byCategoryOrder(fresh.map((a) => ({ ...a, sort_order: writes.find((w) => w.id === a.id)?.sort_order ?? a.sort_order })));
    expect(order.map((a) => a.id)).toEqual(["a", "c", "b"]);
  });
});
