import { describe, expect, it, vi } from "vitest";

const currentWindowMock = {
  close: vi.fn(() => Promise.resolve()),
  minimize: vi.fn(() => Promise.resolve()),
  toggleMaximize: vi.fn(() => Promise.resolve()),
};

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => currentWindowMock,
}));

describe("ipc.window", () => {
  it("delegates close/minimize/toggleMaximize to getCurrentWindow()", async () => {
    const { closeWindow, minimizeWindow, toggleMaximizeWindow } = await import(
      "../../src/modules/ipc/ipc.window"
    );

    await closeWindow();
    await minimizeWindow();
    await toggleMaximizeWindow();

    expect(currentWindowMock.close).toHaveBeenCalledTimes(1);
    expect(currentWindowMock.minimize).toHaveBeenCalledTimes(1);
    expect(currentWindowMock.toggleMaximize).toHaveBeenCalledTimes(1);
  });
});
