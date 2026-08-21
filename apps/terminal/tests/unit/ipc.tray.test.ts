import { describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("ipc.tray", () => {
  it("invokes tray_action with the typed action payload", async () => {
    const { trayAction } = await import("../../src/modules/ipc/ipc.tray");
    invokeMock.mockResolvedValueOnce(undefined);

    await trayAction("show");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-core|tray_action", { action: "show" });
  });
});
