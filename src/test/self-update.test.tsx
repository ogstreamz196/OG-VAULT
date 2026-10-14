import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SelfUpdateModal } from "@/components/tv/SelfUpdateModal";

vi.mock("@/lib/native-install", () => ({
  downloadAndInstallApk: vi.fn(async (_url: string, _name: string, onProgress: (p: number) => void) => {
    onProgress(50);
    onProgress(100);
    return "installed";
  }),
}));

const release = { id: 1, version: "1.1.0", build_number: 2, apk_url: "https://example.com/og.vault.apk", changelog: "Faster downloads", is_mandatory: false, updated_at: "" };

describe("SelfUpdateModal", () => {
  it("shows the new version, notes and both remote-focusable actions", () => {
    render(<SelfUpdateModal release={release} onClose={() => {}} />);
    expect(screen.getByText("A new version of 0G VAULT is ready to install")).toBeInTheDocument();
    expect(screen.getByText(/Version 1\.1\.0/)).toBeInTheDocument();
    expect(screen.getByText("Faster downloads")).toBeInTheDocument();
    const update = screen.getByRole("button", { name: "Update Now" });
    expect(update).toHaveAttribute("data-nav");
    expect(update).toHaveAttribute("data-nav-autofocus");
    expect(screen.getByRole("button", { name: "Later" })).toHaveAttribute("data-nav-dismiss");
  });

  it("hides Later for a required update", () => {
    render(<SelfUpdateModal release={{ ...release, is_mandatory: true }} onClose={() => {}} />);
    expect(screen.queryByRole("button", { name: "Later" })).not.toBeInTheDocument();
  });

  it("downloads the store APK and reports that the installer opened", async () => {
    const { downloadAndInstallApk } = await import("@/lib/native-install");
    render(<SelfUpdateModal release={release} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Update Now" }));
    expect(await screen.findByText(/Installer opened/)).toBeInTheDocument();
    expect(downloadAndInstallApk).toHaveBeenCalledWith(release.apk_url, "0G_VAULT_Update.apk", expect.any(Function));
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
});
