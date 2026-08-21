import { describe, expect, it, vi } from "vitest";

const close = vi.fn().mockResolvedValue(undefined);
const minimize = vi.fn().mockResolvedValue(undefined);
const toggleMaximize = vi.fn().mockResolvedValue(undefined);
const startDragging = vi.fn().mockResolvedValue(undefined);
const theme = vi.fn().mockResolvedValue("dark");
const onThemeChanged = vi.fn().mockResolvedValue(() => undefined);
const getCurrentWindow = vi.fn(() => ({
  close,
  minimize,
  toggleMaximize,
  startDragging,
  theme,
  onThemeChanged,
}));

vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow }));

describe("ipc.window", () => {
  it("delegates window chrome to a cached getCurrentWindow() instance", async () => {
    const { closeWindow, minimizeWindow, toggleMaximizeWindow, startDraggingWindow } = await import(
      "../../src/modules/ipc/ipc.window"
    );

    await closeWindow();
    await minimizeWindow();
    await toggleMaximizeWindow();
    await startDraggingWindow();

    expect(close).toHaveBeenCalledTimes(1);
    expect(minimize).toHaveBeenCalledTimes(1);
    expect(toggleMaximize).toHaveBeenCalledTimes(1);
    expect(startDragging).toHaveBeenCalledTimes(1);
    expect(getCurrentWindow).toHaveBeenCalledTimes(1);
  });

  it("never reaches into the window.__TAURI__ global", async () => {
    await import("../../src/modules/ipc/ipc.window");
    expect((globalThis as Record<string, unknown>).__TAURI__).toBeUndefined();
  });

  it("delegates getWindowTheme and subscribeWindowTheme through the cached window", async () => {
    const { getWindowTheme, subscribeWindowTheme } = await import(
      "../../src/modules/ipc/ipc.window"
    );
    const unlisten = vi.fn();
    const handler = vi.fn();
    theme.mockResolvedValueOnce("light");
    onThemeChanged.mockResolvedValueOnce(unlisten);

    await expect(getWindowTheme()).resolves.toBe("light");
    const result = await subscribeWindowTheme(handler);

    expect(result).toBe(unlisten);
    expect(theme).toHaveBeenCalledTimes(1);
    expect(onThemeChanged).toHaveBeenCalledTimes(1);
    expect(getCurrentWindow).toHaveBeenCalledTimes(1);

    const eventHandler = onThemeChanged.mock.calls[0]?.[0] as (event: {
      payload: "light" | "dark";
    }) => void;
    eventHandler({ payload: "dark" });
    expect(handler).toHaveBeenCalledWith("dark");
  });
});
