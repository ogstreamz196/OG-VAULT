import { beforeEach, describe, expect, it, vi } from "vitest";
import { apkFileName, createPhoneLinkToken, readPhoneLinkToken } from "@/lib/phone-link";

const SECRET = "test-secret";
const APP_A = "11111111-1111-4111-8111-111111111111";
const APP_B = "22222222-2222-4222-8222-222222222222";
const USER = "33333333-3333-4333-8333-333333333333";

describe("phone download tokens", () => {
  it("round-trips and hides the app id", async () => {
    const t = await createPhoneLinkToken({ appId: APP_A, userId: USER, expiresAt: Date.now() + 60_000 }, SECRET);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t).not.toContain("1111");
    const r = await readPhoneLinkToken(t, SECRET);
    expect(r.ok && r.payload.appId).toBe(APP_A);
  });
  it("rejects any edited character", async () => {
    const t = await createPhoneLinkToken({ appId: APP_A, userId: USER, expiresAt: Date.now() + 60_000 }, SECRET);
    for (const i of [0, 5, 20, t.length - 1]) {
      const edited = t.slice(0, i) + (t[i] === "A" ? "B" : "A") + t.slice(i + 1);
      expect((await readPhoneLinkToken(edited, SECRET)).ok).toBe(false);
    }
  });
  it("rejects expired links, other keys and junk", async () => {
    const old = await createPhoneLinkToken({ appId: APP_A, userId: USER, expiresAt: Date.now() - 1 }, SECRET);
    expect(await readPhoneLinkToken(old, SECRET)).toEqual({ ok: false, reason: "expired" });
    const t = await createPhoneLinkToken({ appId: APP_A, userId: USER, expiresAt: Date.now() + 60_000 }, SECRET);
    expect((await readPhoneLinkToken(t, "other-secret")).ok).toBe(false);
    expect((await readPhoneLinkToken("not a token!", SECRET)).ok).toBe(false);
    expect((await readPhoneLinkToken(APP_B, SECRET)).ok).toBe(false);
  });
  it("names the file after the app", () => expect(apkFileName("Cinema HD", "2.1.0")).toBe("Cinema-HD-v2.1.0.apk"));
});

// --- the download route, with the database and file storage mocked ---
const db = vi.hoisted(() => ({ app: null as null | Record<string, unknown>, level: "free", inserts: [] as unknown[] }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => table === "apps"
      ? { select: () => ({ eq: (_c: string, id: string) => ({ maybeSingle: async () => ({ data: db.app && db.app["id"] === id ? db.app : null }) }) }) }
      : { insert: (row: unknown) => { db.inserts.push(row); return Promise.resolve({}); } },
    rpc: async () => ({ data: db.level }),
  },
}));

describe("GET /api/public/dl/$token", async () => {
  const { Route } = await import("@/routes/api/public/dl.$token");
  const get = (token: string) => (Route.options as unknown as { server: { handlers: { GET: (c: { params: { token: string } }) => Promise<Response> } } }).server.handlers.GET({ params: { token } });
  const token = (appId = APP_A, ms = 60_000) => createPhoneLinkToken({ appId, userId: USER, expiresAt: Date.now() + ms }, SECRET);

  beforeEach(() => {
    process.env["VAULT_AUTH_SECRET"] = SECRET;
    db.app = { id: APP_A, title: "Cinema HD", version: "2.1.0", apk_url: "https://files.example/secret-path/cinema.apk", is_active: true, audiences: ["free", "vip"] };
    db.level = "free";
    db.inserts = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url === db.app?.["apk_url"] ? new Response(new Uint8Array([0x50, 0x4b, 3, 4]), { headers: { "content-length": "4" } }) : new Response("nope", { status: 404 }))));
  });

  it("streams the selected app's APK as a download", async () => {
    const res = await get(await token());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/vnd.android.package-archive");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="Cinema-HD-v2.1.0.apk"');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([0x50, 0x4b, 3, 4]));
    expect(db.inserts).toHaveLength(1);
  });
  it("refuses expired and edited links without touching storage", async () => {
    expect((await get(await token(APP_A, -1000))).status).toBe(410);
    const t = await token();
    expect((await get(t.slice(0, -2) + (t.endsWith("AA") ? "BB" : "AA"))).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("re-checks access: VIP apps stay locked for free accounts", async () => {
    db.app = { ...db.app!, audiences: ["vip"] };
    expect((await get(await token())).status).toBe(403);
  });
  it("only ever serves the app the link was made for", async () => {
    expect((await get(await token(APP_B))).status).toBe(404);
  });
});
