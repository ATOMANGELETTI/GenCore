import { describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

class FakeLogicalPosition {
  constructor(
    public x: number,
    public y: number,
  ) {}
}
class FakeLogicalSize {
  constructor(
    public width: number,
    public height: number,
  ) {}
}
vi.mock("@tauri-apps/api/dpi", () => ({
  LogicalPosition: FakeLogicalPosition,
  LogicalSize: FakeLogicalSize,
}));

const listenMock = vi.fn().mockResolvedValue(() => undefined);
vi.mock("@tauri-apps/api/event", () => ({ listen: listenMock }));

const setPosition = vi.fn().mockResolvedValue(undefined);
const setSize = vi.fn().mockResolvedValue(undefined);
const setZoom = vi.fn().mockResolvedValue(undefined);
const show = vi.fn().mockResolvedValue(undefined);
const hide = vi.fn().mockResolvedValue(undefined);
const setFocus = vi.fn().mockResolvedValue(undefined);
const fakeWebview = { setPosition, setSize, setZoom, show, hide, setFocus };
const getByLabel = vi.fn().mockResolvedValue(fakeWebview);
vi.mock("@tauri-apps/api/webview", () => ({ Webview: { getByLabel } }));

describe("ipc.webview", () => {
  it("creates a tab webview via the gencore-browser command", async () => {
    const { createTabWebview } = await import("../../src/modules/ipc/ipc.webview");
    invokeMock.mockResolvedValueOnce(undefined);

    await createTabWebview("tab-1", "https://example.com");

    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-browser|create_tab_webview", {
      label: "tab-1",
      url: "https://example.com",
    });
  });

  it("closes, navigates, and evals a tab webview via the gencore-browser commands", async () => {
    const { closeTabWebview, navigateTabWebview, evalTabWebview } = await import(
      "../../src/modules/ipc/ipc.webview"
    );
    invokeMock.mockResolvedValue(undefined);

    await closeTabWebview("tab-1");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-browser|close_tab_webview", {
      label: "tab-1",
    });

    await navigateTabWebview("tab-1", "https://example.com");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-browser|navigate_tab_webview", {
      label: "tab-1",
      url: "https://example.com",
    });

    await evalTabWebview("tab-1", "history.back()");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-browser|eval_tab_webview", {
      label: "tab-1",
      script: "history.back()",
    });
  });

  it("sets bounds on the built-in Webview instance by label", async () => {
    const { setTabWebviewBounds } = await import("../../src/modules/ipc/ipc.webview");

    await setTabWebviewBounds("tab-1", { x: 0, y: 40, width: 800, height: 600 });

    expect(getByLabel).toHaveBeenCalledWith("tab-1");
    expect(setPosition).toHaveBeenCalledWith(new FakeLogicalPosition(0, 40));
    expect(setSize).toHaveBeenCalledWith(new FakeLogicalSize(800, 600));
  });

  it("shows, hides, focuses, and zooms the built-in Webview instance by label", async () => {
    const { showTabWebview, hideTabWebview, focusTabWebview, setTabWebviewZoom } = await import(
      "../../src/modules/ipc/ipc.webview"
    );

    await showTabWebview("tab-1");
    expect(show).toHaveBeenCalledTimes(1);

    await hideTabWebview("tab-1");
    expect(hide).toHaveBeenCalledTimes(1);

    await focusTabWebview("tab-1");
    expect(setFocus).toHaveBeenCalledTimes(1);

    await setTabWebviewZoom("tab-1", 1.25);
    expect(setZoom).toHaveBeenCalledWith(1.25);
  });
});
