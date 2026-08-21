import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TITLE, App } from "../../src/modules/app/app.component";
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

vi.mock("../../src/modules/ipc/ipc.opener", () => ({
  openRepoInBrowser: vi.fn(() => Promise.resolve()),
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

vi.mock("../../src/modules/terminal/terminal.component", () => ({
  TerminalView: () => {
    throw new Error("xterm exploded");
  },
}));

restoreJsdomLocalStorage();

describe("App TerminalView error boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getWindowTheme).mockResolvedValue("dark");
    vi.mocked(subscribeWindowTheme).mockResolvedValue(() => undefined);
  });

  it("keeps AppShell chrome when TerminalView throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("banner")).toHaveTextContent(APP_TITLE);
    });
    expect(screen.getByRole("button", { name: "Close window" })).toBeInTheDocument();
    expect(screen.getByRole("complementary")).toHaveAttribute("data-slot", "side-panel");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Terminal failed to start");

    errorSpy.mockRestore();
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
