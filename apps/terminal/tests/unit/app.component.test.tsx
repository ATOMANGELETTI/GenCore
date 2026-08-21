import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TITLE, App } from "../../src/modules/app/app.component";
import { getAppInfo } from "../../src/modules/ipc/ipc.app-info";
import type { AppInfo } from "../../src/modules/ipc/ipc.types";
import { getWindowTheme, subscribeWindowTheme } from "../../src/modules/ipc/ipc.window";

const mockAppInfo: AppInfo = {
  name: "GenCore Terminal",
  version: "0.1.0",
  identifier: "com.gencore.terminal",
};

vi.mock("../../src/modules/ipc/ipc.app-info", () => ({
  getAppInfo: vi.fn(() => Promise.resolve(mockAppInfo)),
}));

const { getWindowTheme: getWindowThemeMock, subscribeWindowTheme: subscribeWindowThemeMock } =
  vi.hoisted(() => ({
    getWindowTheme: vi.fn(() => Promise.resolve("dark" as const)),
    subscribeWindowTheme: vi.fn(async () => () => undefined),
  }));

vi.mock("../../src/modules/ipc/ipc.window", () => ({
  closeWindow: vi.fn(() => Promise.resolve()),
  minimizeWindow: vi.fn(() => Promise.resolve()),
  toggleMaximizeWindow: vi.fn(() => Promise.resolve()),
  getWindowTheme: getWindowThemeMock,
  subscribeWindowTheme: subscribeWindowThemeMock,
}));

const { openRepoInBrowser } = vi.hoisted(() => ({
  openRepoInBrowser: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../src/modules/ipc/ipc.opener", () => ({
  openRepoInBrowser,
}));

vi.mock("../../src/modules/ipc/ipc.fs", () => ({
  listDrives: vi.fn(() => Promise.resolve([])),
  listDir: vi.fn(),
  createFile: vi.fn(),
  createDir: vi.fn(),
  watchDir: vi.fn(),
  unwatchDir: vi.fn(),
  subscribeFsChanges: vi.fn(async () => () => {}),
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWindowTheme).mockResolvedValue("dark");
    vi.mocked(subscribeWindowTheme).mockResolvedValue(() => undefined);
  });

  it("renders the exact template title in the heading and titlebar", async () => {
    render(<App />);

    const matches = await screen.findAllByText(APP_TITLE);
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("heading", { name: APP_TITLE })).toBeInTheDocument();
  });

  it("renders the version from get_app_info in the titlebar, not the statusbar", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("banner")).toHaveTextContent(mockAppInfo.version);
    });
    expect(screen.getByRole("contentinfo")).not.toHaveTextContent(mockAppInfo.version);
  });

  it("never touches window.__TAURI__", async () => {
    render(<App />);
    await screen.findAllByText(APP_TITLE);

    expect((window as unknown as Record<string, unknown>).__TAURI__).toBeUndefined();
  });

  it("opens the GitHub repo from the titlebar version chip", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("banner")).toHaveTextContent(mockAppInfo.version);
    });

    await user.click(screen.getByRole("button", { name: "Open the GenCore GitHub repository" }));
    expect(openRepoInBrowser).toHaveBeenCalledTimes(1);
  });

  it("renders SidePanel in the sidebar without replacing the workbench heading", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: APP_TITLE })).toBeInTheDocument();
    expect(screen.getByRole("complementary")).toHaveAttribute("data-slot", "side-panel");
    expect(await screen.findByText("FILES")).toBeVisible();
    expect(screen.queryByText("Tab 1")).toBeNull();
    expect(screen.getByRole("tablist", { name: "Side panel" })).toBeInTheDocument();
  });

  it("shows a getAppInfo error in the content area, not the statusbar", async () => {
    vi.mocked(getAppInfo).mockRejectedValueOnce(new Error("core unavailable"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveTextContent("core unavailable");
    });
    expect(screen.getByRole("contentinfo")).not.toHaveTextContent("core unavailable");
  });

  it("applies Snow Storm after the OS window theme resolves to light", async () => {
    vi.mocked(getWindowTheme).mockResolvedValueOnce("light");

    render(<App />);

    await waitFor(() => {
      const wrapper = document.querySelector('[data-slot="theme-provider"]');
      expect(wrapper).toHaveAttribute("data-theme", "snow-storm");
      expect(wrapper).toHaveClass("theme-snow-storm", "light");
    });
  });

  it("flips Polar Night to Snow Storm when the window theme subscription reports light", async () => {
    let onTheme: ((theme: "light" | "dark") => void) | undefined;
    vi.mocked(subscribeWindowTheme).mockImplementation(
      async (handler: (theme: "light" | "dark") => void) => {
        onTheme = handler;
        return () => undefined;
      },
    );

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
});
