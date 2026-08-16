import { describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

describe("getAppInfo", () => {
  it("invokes the gencore-core plugin command with no arguments", async () => {
    invoke.mockResolvedValueOnce({
      name: "GenCore Explorer",
      version: "0.1.0",
      identifier: "com.gencore.explorer",
    });

    const { getAppInfo } = await import("../../src/modules/ipc/ipc.app-info");
    const info = await getAppInfo();

    expect(invoke).toHaveBeenCalledWith("plugin:gencore-core|get_app_info");
    expect(info).toEqual({
      name: "GenCore Explorer",
      version: "0.1.0",
      identifier: "com.gencore.explorer",
    });
  });
});
