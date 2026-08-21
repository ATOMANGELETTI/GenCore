import { describe, expect, it, vi } from "vitest";

const currentWindowMock = {
  close: vi.fn(() => Promise.resolve()),
  minimize: vi.fn(() => Promise.resolve()),
  toggleMaximize: vi.fn(() => Promise.resolve()),
  startDragging: vi.fn(() => Promise.resolve()),
  theme: vi.fn<() => Promise<"light" | "dark" | null>>(() => Promise.resolve("dark")),
  onThemeChanged: vi.fn<(handler: (event: { payload: "light" | "dark" }) => void) => Promise<() => void>>(
    () => Promise.resolve(() => undefined),
  ),
};

const getCurrentWindow = vi.fn(() => currentWindowMock);

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow,
}));

describe("ipc.window", () => {
  it("delegates close/minimize/toggleMaximize/startDragging and caches getCurrentWindow", async () => {
    const { closeWindow, minimizeWindow, toggleMaximizeWindow, startDraggingWindow } = await import(
      "../../src/modules/ipc/ipc.window"
    );

    await closeWindow();
    await minimizeWindow();
    await toggleMaximizeWindow();
    await startDraggingWindow();

    expect(currentWindowMock.close).toHaveBeenCalledTimes(1);
    expect(currentWindowMock.minimize).toHaveBeenCalledTimes(1);
    expect(currentWindowMock.toggleMaximize).toHaveBeenCalledTimes(1);
    expect(currentWindowMock.startDragging).toHaveBeenCalledTimes(1);
    expect(getCurrentWindow).toHaveBeenCalledTimes(1);
  });

  it("delegates getWindowTheme and subscribeWindowTheme through the cached window", async () => {
    const { getWindowTheme, subscribeWindowTheme } = await import(
      "../../src/modules/ipc/ipc.window"
    );
    const unlisten = vi.fn();
    const handler = vi.fn();
    currentWindowMock.theme.mockResolvedValueOnce("light");
    currentWindowMock.onThemeChanged.mockResolvedValueOnce(unlisten);

    await expect(getWindowTheme()).resolves.toBe("light");
    const result = await subscribeWindowTheme(handler);

    expect(result).toBe(unlisten);
    expect(currentWindowMock.theme).toHaveBeenCalledTimes(1);
    expect(currentWindowMock.onThemeChanged).toHaveBeenCalledTimes(1);
    expect(getCurrentWindow).toHaveBeenCalledTimes(1);

    const eventHandler = currentWindowMock.onThemeChanged.mock.calls[0]?.[0];
    eventHandler?.({ payload: "dark" });
    expect(handler).toHaveBeenCalledWith("dark");
  });
});
