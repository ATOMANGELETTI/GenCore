import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TITLE, App } from "../../src/modules/app/app.component";
import type { AppInfo } from "../../src/modules/ipc/ipc.types";

const mockAppInfo: AppInfo = {
  name: "GenCore Terminal",
  version: "0.1.0",
  identifier: "com.gencore.terminal",
};

vi.mock("../../src/modules/ipc/ipc.app-info", () => ({
  getAppInfo: vi.fn(() => Promise.resolve(mockAppInfo)),
}));

vi.mock("../../src/modules/ipc/ipc.window", () => ({
  closeWindow: vi.fn(() => Promise.resolve()),
  minimizeWindow: vi.fn(() => Promise.resolve()),
  toggleMaximizeWindow: vi.fn(() => Promise.resolve()),
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the exact template title in the heading and titlebar", async () => {
    render(<App />);

    const matches = await screen.findAllByText(APP_TITLE);
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("heading", { name: APP_TITLE })).toBeInTheDocument();
  });

  it("renders the version from get_app_info in the titlebar and statusbar", async () => {
    render(<App />);

    await waitFor(() => {
      const versionNodes = screen.getAllByText(mockAppInfo.version, { exact: false });
      expect(versionNodes.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("never touches window.__TAURI__", async () => {
    render(<App />);
    await screen.findAllByText(APP_TITLE);

    expect((window as unknown as Record<string, unknown>).__TAURI__).toBeUndefined();
  });
});
