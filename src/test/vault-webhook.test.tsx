import { describe, it, expect } from "vitest";
import { hmacHex, safeEqual, timestampFresh } from "@/lib/vault-crypto";

describe("OG Vault webhook checks", () => {
  it("rejects timestamps older than 5 minutes", () => {
    const now = 1_800_000_000_000;
    expect(timestampFresh(now - 6 * 60_000, now)).toBe(false);
    expect(timestampFresh(now - 4 * 60_000, now)).toBe(true);
    expect(timestampFresh((now - 4 * 60_000) / 1000, now)).toBe(true);
  });
  it("signature must match HMAC of the exact body", async () => {
    const sig = await hmacHex("s3cret", '{"a":1}');
    expect(safeEqual(sig, await hmacHex("s3cret", '{"a":1}'))).toBe(true);
    expect(safeEqual(sig, await hmacHex("s3cret", '{"a": 1}'))).toBe(false);
    expect(safeEqual(sig, await hmacHex("other", '{"a":1}'))).toBe(false);
  });
});
