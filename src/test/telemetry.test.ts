import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/native-install", () => ({ isNative: () => false }));
import { aggregate } from "@/lib/telemetry";

const ev = (event_type: string) => ({ app_id: "a", event_type, created_at: "2026-10-01T00:00:00Z", error_message: event_type.endsWith("failed") ? "boom" : null });

describe("install analytics", () => {
  it("failure rate is failures divided by download attempts", () => {
    const s = aggregate([ev("download_started"), ev("download_started"), ev("download_started"), ev("download_started"), ev("download_failed"), ev("install_prompted")])[0]!;
    expect(s.downloads).toBe(4);
    expect(s.failures).toBe(1);
    expect(s.installs).toBe(1);
    expect(s.failureRate).toBe(0.25);
  });
});
