import { describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("ipc.tray", () => {
  it.each(["show", "hide", "quit"] as const)(
    "invokes tray_action with action=%s",
    async (action) => {
      const { trayAction } = await import("../../src/modules/ipc/ipc.tray");
      invokeMock.mockResolvedValueOnce(undefined);

      await trayAction(action);

      expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-core|tray_action", { action });
    },
  );
});
