import { describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

describe("ipc.tray", () => {
  it("invokes tray_action with the typed action payload", async () => {
    invoke.mockResolvedValueOnce(undefined);

    const { trayAction } = await import("../../src/modules/ipc/ipc.tray");
    await trayAction("show");

    expect(invoke).toHaveBeenCalledWith("plugin:gencore-core|tray_action", { action: "show" });
  });
});
