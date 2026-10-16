import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeClientPurge, isPreservedKey, purgeDecision, PURGE_TOKEN_KEY } from "@/lib/cache-purge";

vi.mock("@/lib/adb-bridge", () => ({ clearNativeWebCache: vi.fn(async () => false) }));

describe("purge decision", () => {
  it("purges for a new token the device hasn't handled", () => expect(purgeDecision("t2", "t1")).toBe("purge"));
  it("does nothing for a token already handled or when none is published", () => {
    expect(purgeDecision("t1", "t1")).toBe("none");
    expect(purgeDecision(null, "t1")).toBe("none");
  });
  it("a brand-new device adopts the token instead of reloading", () => expect(purgeDecision("t1", null)).toBe("adopt"));
});

describe("executeClientPurge", () => {
  const replace = vi.fn();
  const unregister = vi.fn(async () => true);
  const cacheDelete = vi.fn(async () => true);
  const queryClear = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    replace.mockReset();
    Object.defineProperty(window, "location", { configurable: true, value: { ...window.location, href: "https://vault.ogstreamz.co.uk/app/abc", replace } });
    Object.defineProperty(window, "caches", { configurable: true, value: { keys: async () => ["vite-assets", "old-shell"], delete: cacheDelete } });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistrations: async () => [{ unregister }, { unregister }] } });
  });

  it("wipes caches, workers and stray storage but keeps the sign-in session", async () => {
    const session = JSON.stringify({ access_token: "a", refresh_token: "r" });
    localStorage.setItem("sb-yblbmusdgtnunipgzbnf-auth-token", session);
    localStorage.setItem("ogvault.installed", '{"x":1}');
    localStorage.setItem("some-stale-key", "old");
    sessionStorage.setItem("ogvault.nav-focus", "{}");

    const reloading = await executeClientPurge("2026-10-16T10:00:00.000Z", { clear: queryClear } as never);

    expect(reloading).toBe(true);
    expect(localStorage.getItem("sb-yblbmusdgtnunipgzbnf-auth-token")).toBe(session);
    expect(localStorage.getItem("ogvault.installed")).toBe('{"x":1}');
    expect(localStorage.getItem(PURGE_TOKEN_KEY)).toBe("2026-10-16T10:00:00.000Z");
    expect(localStorage.getItem("some-stale-key")).toBeNull();
    expect(sessionStorage.length).toBe(0);
    expect(cacheDelete).toHaveBeenCalledTimes(2);
    expect(unregister).toHaveBeenCalledTimes(2);
    expect(queryClear).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/vault\.ogstreamz\.co\.uk\/app\/abc\?_cb=\d+$/));
  });

  it("never reloads when the device can't remember the token (avoids a reload loop)", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(await executeClientPurge("t", undefined)).toBe(false);
    expect(replace).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it("knows which keys to keep", () => {
    expect(isPreservedKey("sb-abc-auth-token")).toBe(true);
    expect(isPreservedKey("ogvault.adbHost")).toBe(true);
    expect(isPreservedKey("random")).toBe(false);
  });
});
