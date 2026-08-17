import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const { openRepoInBrowser } = vi.hoisted(() => ({
  openRepoInBrowser: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../src/modules/ipc/ipc.opener", () => ({
  openRepoInBrowser,
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
    expect(screen.getByText("Tab 1")).toBeVisible();
    expect(screen.getByRole("tablist", { name: "Side panel" })).toBeInTheDocument();
  });
});
