import { describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("ipc.theme-icon", () => {
  it("invokes set_theme_icon with polar-night theme payload", async () => {
    const { setThemeIcon } = await import("../../src/modules/ipc/ipc.theme-icon");
    invokeMock.mockResolvedValueOnce(undefined);

    await setThemeIcon("polar-night");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-core|set_theme_icon", {
      theme: "polar-night",
    });
  });

  it("invokes set_theme_icon with snow-storm theme payload", async () => {
    const { setThemeIcon } = await import("../../src/modules/ipc/ipc.theme-icon");
    invokeMock.mockResolvedValueOnce(undefined);

    await setThemeIcon("snow-storm");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-core|set_theme_icon", {
      theme: "snow-storm",
    });
  });
});
