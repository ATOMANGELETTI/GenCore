import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TITLE, App } from "../../src/modules/app/app.component";
import { CONFIG_STORAGE_KEY } from "../../src/modules/config/config.storage";
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

vi.mock("../../src/modules/ipc/ipc.pty", () => ({
  openPty: vi.fn(async () => ({ session_id: "session-test" })),
  writePty: vi.fn(async () => undefined),
  resizePty: vi.fn(async () => undefined),
  closePty: vi.fn(async () => undefined),
  subscribePtyData: vi.fn(async () => () => undefined),
  subscribePtyExit: vi.fn(async () => () => undefined),
}));

vi.mock("../../src/modules/terminal/terminal.xterm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/modules/terminal/terminal.xterm")>();
  return {
    ...actual,
    createXterm: vi.fn(() => {
      const terminal = {
        cols: 80,
        rows: 24,
        options: { theme: {} },
        onData: vi.fn(() => ({ dispose: vi.fn() })),
        attachCustomKeyEventHandler: vi.fn(),
        write: vi.fn(),
        focus: vi.fn(),
        getSelection: vi.fn(() => ""),
        hasSelection: vi.fn(() => false),
        selectAll: vi.fn(),
        paste: vi.fn(),
        dispose: vi.fn(),
      };
      return {
        terminal,
        fit: { fit: vi.fn() },
        serialize: { serialize: vi.fn(() => "") },
        dispose: vi.fn(),
      };
    }),
  };
});

restoreJsdomLocalStorage();

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getWindowTheme).mockResolvedValue("dark");
    vi.mocked(subscribeWindowTheme).mockResolvedValue(() => undefined);
  });

  it("renders the exact template title in the titlebar", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("banner")).toHaveTextContent(APP_TITLE);
    });
    expect(screen.queryByRole("heading", { name: APP_TITLE })).not.toBeInTheDocument();
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

  it("renders SidePanel in the sidebar without replacing the workbench titlebar", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("banner")).toHaveTextContent(APP_TITLE);
    });
    expect(screen.getByRole("complementary")).toHaveAttribute("data-slot", "side-panel");
    expect(await screen.findByText("FILES")).toBeVisible();
    expect(screen.queryByText("Tab 1")).toBeNull();
    expect(screen.getByRole("tablist", { name: "Side panel" })).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Terminal sessions" })).toBeInTheDocument();
  });

  it("does not show a getAppInfo error in the statusbar", async () => {
    vi.mocked(getAppInfo).mockRejectedValueOnce(new Error("core unavailable"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("banner")).toHaveTextContent(APP_TITLE);
    });
    expect(screen.getByRole("contentinfo")).not.toHaveTextContent("core unavailable");
    expect(screen.getByRole("contentinfo")).not.toHaveTextContent(mockAppInfo.version);
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

  it("applies Snow Storm from stored preference even when the OS window theme is dark", async () => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ version: 1, theme: "snow-storm" }));
    vi.mocked(getWindowTheme).mockResolvedValue("dark");

    render(<App />);

    await waitFor(() => {
      const wrapper = document.querySelector('[data-slot="theme-provider"]');
      expect(wrapper).toHaveAttribute("data-theme", "snow-storm");
      expect(wrapper).toHaveClass("theme-snow-storm", "light");
    });
    expect(subscribeWindowTheme).not.toHaveBeenCalled();
  });
});

function restoreJsdomLocalStorage(): void {
  const jsdomStorage = (window as unknown as { _localStorage?: Storage })._localStorage;
  if (!jsdomStorage) {
    return;
  }

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    enumerable: true,
    get: () => jsdomStorage,
  });
}
