import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAppInfo = vi.fn();
const closeWindow = vi.fn();
const minimizeWindow = vi.fn();
const toggleMaximizeWindow = vi.fn();
const getWindowTheme = vi.fn();
const subscribeWindowTheme = vi.fn();
const openRepoInBrowser = vi.fn();
const setThemeIcon = vi.fn(() => Promise.resolve());

vi.mock("../../src/modules/ipc/ipc.app-info", () => ({ getAppInfo }));
vi.mock("../../src/modules/ipc/ipc.window", () => ({
  closeWindow,
  minimizeWindow,
  toggleMaximizeWindow,
  getWindowTheme,
  subscribeWindowTheme,
}));
const openFile = vi.fn(() => Promise.resolve());

vi.mock("../../src/modules/ipc/ipc.opener", () => ({
  openRepoInBrowser,
  openFile,
}));
vi.mock("../../src/modules/ipc/ipc.theme-icon", () => ({
  setThemeIcon,
}));
vi.mock("../../src/modules/ipc/ipc.fs", () => ({
  listDrives: vi.fn(() => Promise.resolve([])),
  listDir: vi.fn(() => Promise.resolve({ entries: [] })),
  statPath: vi.fn(() => Promise.reject(new Error("no stat in tests"))),
  createFile: vi.fn(() => Promise.resolve()),
  createDir: vi.fn(() => Promise.resolve()),
  renamePath: vi.fn(() => Promise.resolve({ path: "" })),
  deletePaths: vi.fn(() => Promise.resolve()),
  copyPaths: vi.fn(() => Promise.resolve()),
  movePaths: vi.fn(() => Promise.resolve()),
  watchDir: vi.fn(() => Promise.resolve()),
  unwatchDir: vi.fn(() => Promise.resolve()),
  subscribeFsChanges: vi.fn(() => Promise.resolve(() => undefined)),
}));

describe("App", () => {
  beforeEach(() => {
    getWindowTheme.mockReset();
    subscribeWindowTheme.mockReset();
    getWindowTheme.mockResolvedValue("dark");
    subscribeWindowTheme.mockResolvedValue(() => undefined);
  });

  it("renders the exact template copy in the titlebar and the real file explorer body", async () => {
    getAppInfo.mockResolvedValue({
      name: "GenCore Explorer",
      version: "0.1.0",
      identifier: "com.gencore.explorer",
    });

    const { App } = await import("../../src/modules/app/app.component");
    render(<App />);

    expect(screen.getByRole("banner")).toHaveTextContent("Tauri Explorer Template");
    expect(screen.getByRole("button", { name: "New folder" })).toBeInTheDocument();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tree" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Config" })).toBeInTheDocument();
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

  it("applies Snow Storm after the OS window theme resolves to light", async () => {
    getWindowTheme.mockResolvedValueOnce("light");

    const { App } = await import("../../src/modules/app/app.component");
    render(<App />);

    await waitFor(() => {
      const wrapper = document.querySelector('[data-slot="theme-provider"]');
      expect(wrapper).toHaveAttribute("data-theme", "snow-storm");
      expect(wrapper).toHaveClass("theme-snow-storm", "light");
    });
  });

  it("flips Polar Night to Snow Storm when the window theme subscription reports light", async () => {
    let onTheme: ((theme: "light" | "dark") => void) | undefined;
    subscribeWindowTheme.mockImplementation(async (handler: (theme: "light" | "dark") => void) => {
      onTheme = handler;
      return () => undefined;
    });

    const { App } = await import("../../src/modules/app/app.component");
    render(<App />);

    await waitFor(() => expect(subscribeWindowTheme).toHaveBeenCalledTimes(1));
    const wrapper = document.querySelector('[data-slot="theme-provider"]');
    expect(wrapper).toHaveAttribute("data-theme", "polar-night");
    expect(wrapper).toHaveClass("theme-polar-night", "dark");

    act(() => {
      onTheme?.("light");
    });

    await waitFor(() => {
      expect(wrapper).toHaveAttribute("data-theme", "snow-storm");
      expect(wrapper).toHaveClass("theme-snow-storm", "light");
    });
  });

  it("synchronizes native theme icon and DOM favicon on theme transition", async () => {
    let onTheme: ((theme: "light" | "dark") => void) | undefined;
    subscribeWindowTheme.mockImplementation(async (handler: (theme: "light" | "dark") => void) => {
      onTheme = handler;
      return () => undefined;
    });

    const { App } = await import("../../src/modules/app/app.component");
    render(<App />);

    await waitFor(() => {
      expect(setThemeIcon).toHaveBeenCalledWith("polar-night");
    });

    const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    expect(link).not.toBeNull();
    expect(link?.href).toContain("favicon_snow-storm.png");

    act(() => {
      onTheme?.("light");
    });

    await waitFor(() => {
      expect(setThemeIcon).toHaveBeenCalledWith("snow-storm");
    });
    expect(link?.href).toContain("favicon_polar-night.png");
  });
});
