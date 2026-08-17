import { describe, expect, it, vi } from "vitest";

const currentWindowMock = {
  close: vi.fn(() => Promise.resolve()),
  minimize: vi.fn(() => Promise.resolve()),
  toggleMaximize: vi.fn(() => Promise.resolve()),
  startDragging: vi.fn(() => Promise.resolve()),
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
});
