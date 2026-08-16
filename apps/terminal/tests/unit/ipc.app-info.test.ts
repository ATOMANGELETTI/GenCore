import { describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("ipc.app-info", () => {
  it("invokes the gencore-core plugin command id and returns typed AppInfo", async () => {
    const { getAppInfo } = await import("../../src/modules/ipc/ipc.app-info");
    const appInfo = {
      name: "GenCore Terminal",
      version: "0.1.0",
      identifier: "com.gencore.terminal",
    };
    invokeMock.mockResolvedValueOnce(appInfo);

    const result = await getAppInfo();

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-core|get_app_info");
    expect(result).toEqual(appInfo);
  });
});
