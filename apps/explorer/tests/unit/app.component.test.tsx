import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getAppInfo = vi.fn();
const closeWindow = vi.fn();
const minimizeWindow = vi.fn();
const toggleMaximizeWindow = vi.fn();
const openRepoInBrowser = vi.fn();

vi.mock("../../src/modules/ipc/ipc.app-info", () => ({ getAppInfo }));
vi.mock("../../src/modules/ipc/ipc.window", () => ({
  closeWindow,
  minimizeWindow,
  toggleMaximizeWindow,
}));
vi.mock("../../src/modules/ipc/ipc.opener", () => ({
  openRepoInBrowser,
}));

describe("App", () => {
  it("renders the exact template heading", async () => {
    getAppInfo.mockResolvedValue({
      name: "GenCore Explorer",
      version: "0.1.0",
      identifier: "com.gencore.explorer",
    });

    const { App } = await import("../../src/modules/app/app.component");
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Tauri Explorer Template" }),
    ).toBeInTheDocument();
  });

  it("shows the version from get_app_info in the titlebar, not the statusbar", async () => {
    getAppInfo.mockResolvedValue({
      name: "GenCore Explorer",
      version: "0.1.0",
      identifier: "com.gencore.explorer",
    });

    const { App } = await import("../../src/modules/app/app.component");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("banner")).toHaveTextContent("0.1.0");
    });
    expect(screen.getByRole("contentinfo")).not.toHaveTextContent("0.1.0");
  });

  it("wires the traffic lights to the typed window IPC module, not window.__TAURI__", async () => {
    getAppInfo.mockResolvedValue({
      name: "GenCore Explorer",
      version: "0.1.0",
      identifier: "com.gencore.explorer",
    });
    expect((globalThis as Record<string, unknown>).__TAURI__).toBeUndefined();

    const { App } = await import("../../src/modules/app/app.component");
    const { default: userEvent } = await import("@testing-library/user-event");
    render(<App />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(closeWindow).toHaveBeenCalledTimes(1);
  });

  it("opens the GitHub repo from the titlebar version chip", async () => {
    getAppInfo.mockResolvedValue({
      name: "GenCore Explorer",
      version: "0.1.0",
      identifier: "com.gencore.explorer",
    });

    const { App } = await import("../../src/modules/app/app.component");
    const { default: userEvent } = await import("@testing-library/user-event");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("banner")).toHaveTextContent("0.1.0");
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open the GenCore GitHub repository" }));
    expect(openRepoInBrowser).toHaveBeenCalledTimes(1);
  });
});
