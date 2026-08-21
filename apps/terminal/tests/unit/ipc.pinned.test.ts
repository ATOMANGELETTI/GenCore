import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("ipc.pinned", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("invokes load_pinned_tabs with no args and returns the json string", async () => {
    const { loadPinnedTabs } = await import("../../src/modules/ipc/ipc.pinned");
    invokeMock.mockResolvedValueOnce('{"version":1,"tabs":[]}');

    const result = await loadPinnedTabs();

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-core|load_pinned_tabs");
    expect(result).toBe('{"version":1,"tabs":[]}');
  });

  it("invokes save_pinned_tabs with a json payload", async () => {
    const { savePinnedTabs } = await import("../../src/modules/ipc/ipc.pinned");
    invokeMock.mockResolvedValueOnce(undefined);

    await savePinnedTabs('{"version":1}');

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-core|save_pinned_tabs", {
      json: '{"version":1}',
    });
  });
});
