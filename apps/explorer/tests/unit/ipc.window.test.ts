import { describe, expect, it, vi } from "vitest";

const close = vi.fn().mockResolvedValue(undefined);
const minimize = vi.fn().mockResolvedValue(undefined);
const toggleMaximize = vi.fn().mockResolvedValue(undefined);
const getCurrentWindow = vi.fn(() => ({ close, minimize, toggleMaximize }));

vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow }));

describe("ipc.window", () => {
  it("closeWindow delegates to the current window's close command", async () => {
    const { closeWindow } = await import("../../src/modules/ipc/ipc.window");
    await closeWindow();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("minimizeWindow delegates to the current window's minimize command", async () => {
    const { minimizeWindow } = await import("../../src/modules/ipc/ipc.window");
    await minimizeWindow();
    expect(minimize).toHaveBeenCalledTimes(1);
  });

  it("toggleMaximizeWindow delegates to the current window's toggle-maximize command", async () => {
    const { toggleMaximizeWindow } = await import("../../src/modules/ipc/ipc.window");
    await toggleMaximizeWindow();
    expect(toggleMaximize).toHaveBeenCalledTimes(1);
  });

  it("never reaches into the window.__TAURI__ global", async () => {
    await import("../../src/modules/ipc/ipc.window");
    expect((globalThis as Record<string, unknown>).__TAURI__).toBeUndefined();
  });
});
