import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/ipc/ipc.fs", () => ({
  listDrives: vi.fn(() =>
    Promise.resolve([{ name: "C:", path: "C:\\", kind: "fixed", label: null }]),
  ),
  listDir: vi.fn(() => Promise.resolve({ entries: [] })),
  createFile: vi.fn(() => Promise.resolve()),
  createDir: vi.fn(() => Promise.resolve()),
  watchDir: vi.fn(() => Promise.resolve()),
  unwatchDir: vi.fn(() => Promise.resolve()),
  subscribeFsChanges: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock("../../src/modules/ipc/ipc.assistant", () => ({
  listConversations: vi.fn(() => Promise.resolve([])),
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  listMessages: vi.fn(() => Promise.resolve({ messages: [], pending: [] })),
  sendMessage: vi.fn(),
  cancelTurn: vi.fn(),
  confirmAction: vi.fn(),
  rejectAction: vi.fn(),
  subscribeAssistantToken: vi.fn(() => Promise.resolve(() => {})),
  subscribeAssistantTurn: vi.fn(() => Promise.resolve(() => {})),
  subscribeAssistantError: vi.fn(() => Promise.resolve(() => {})),
  subscribeAssistantUiAction: vi.fn(() => Promise.resolve(() => {})),
}));

import { ConfigProvider } from "../../src/modules/config/config.hook";
import { FileTreeProvider } from "../../src/modules/file-tree/file-tree.hook";
import { SidePanel } from "../../src/modules/side-panel/side-panel.component";

restoreJsdomLocalStorage();

function getTabpanel(id: "files" | "assistant" | "config") {
  const panel = document.getElementById(`side-panel-${id}`);
  expect(panel).toBeTruthy();
  return panel as HTMLElement;
}

function expectPanelHiddenState(id: "files" | "assistant" | "config", isHidden: boolean) {
  const panel = getTabpanel(id);
  if (isHidden) {
    expect(panel).toHaveAttribute("hidden");
  } else {
    expect(panel).not.toHaveAttribute("hidden");
  }
  expect(panel).not.toHaveClass("flex");
}

async function renderSidePanel() {
  const view = render(
    <ConfigProvider>
      <FileTreeProvider>
        <SidePanel />
      </FileTreeProvider>
    </ConfigProvider>,
  );
  expect(await screen.findByText("FILES")).toBeVisible();
  expect(await screen.findByRole("treeitem", { name: "C:" })).toBeVisible();
  return view;
}

describe("SidePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows FILES by default and hides the other panels", async () => {
    await renderSidePanel();

    expect(screen.getByText("FILES")).toBeVisible();
    expect(screen.getByRole("tree")).toBeVisible();
    expect(screen.queryByText("Tab 1")).toBeNull();
    expect(screen.queryByText("Tab 2")).toBeNull();
    expect(screen.queryByText("Tab 3")).toBeNull();
    expectPanelHiddenState("files", false);
    expectPanelHiddenState("assistant", true);
    expectPanelHiddenState("config", true);
  });

  it("shows ASSISTANT when the Assistant tab is clicked", async () => {
    const user = userEvent.setup();
    await renderSidePanel();

    await user.click(screen.getByRole("tab", { name: "Assistant" }));

    expect(screen.getByText("ASSISTANT")).toBeVisible();
    expect(screen.queryByText("Tab 2")).toBeNull();
    expect(screen.queryByText("Tab 1")).toBeNull();
    expect(screen.queryByText("Tab 3")).toBeNull();
    expectPanelHiddenState("assistant", false);
    expectPanelHiddenState("files", true);
    expectPanelHiddenState("config", true);
  });

  it("shows CONFIG when the Config tab is clicked", async () => {
    const user = userEvent.setup();
    await renderSidePanel();

    await user.click(screen.getByRole("tab", { name: "Config" }));

    expect(screen.getByRole("tablist", { name: "Configuration categories" })).toBeVisible();
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeVisible();
    expect(screen.queryByText("Tab 3")).toBeNull();
    expect(screen.queryByText("Tab 2")).toBeNull();
    expectPanelHiddenState("config", false);
    expectPanelHiddenState("files", true);
    expectPanelHiddenState("assistant", true);
  });

  it("exposes a Side panel tablist with Files, Assistant, and Config tabs", async () => {
    await renderSidePanel();

    const tablist = screen.getByRole("tablist", { name: "Side panel" });
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveClass("h-6");
    expect(screen.getByRole("tab", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Assistant" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Config" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Settings" })).toBeNull();

    for (const name of ["Files", "Assistant", "Config"] as const) {
      const icon = screen.getByRole("tab", { name }).querySelector("svg");
      expect(icon).toHaveClass("size-3");
    }

    const filesTab = screen.getByRole("tab", { name: "Files" });
    expect(filesTab).toHaveClass("text-accent-foreground", "before:bg-primary");
    expect(filesTab).not.toHaveClass("text-primary");

    expect(screen.getByRole("tab", { name: "Assistant" })).toHaveClass("text-muted-foreground");
  });

  it("renders an aside complementary root with the side-panel slot", async () => {
    await renderSidePanel();

    const root = screen.getByRole("complementary");
    expect(root.tagName).toBe("ASIDE");
    expect(root).toHaveAttribute("data-slot", "side-panel");
  });

  it("defaults the complementary root to 240px wide", async () => {
    await renderSidePanel();

    expect(screen.getByRole("complementary")).toHaveStyle({ width: "240px" });
  });

  it("exposes a vertical resize slider on the panel seam", async () => {
    await renderSidePanel();

    const handle = screen.getByRole("slider", { name: "Resize side panel" });
    expect(handle.tagName).not.toBe("HR");
    expect(handle).toHaveAttribute("role", "slider");
    expect(handle).toHaveAttribute("data-slot", "side-panel-resize");
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-valuenow", "240");
    expect(handle).toHaveAttribute("aria-valuemin", "160");
  });

  it("grows the panel 10px on ArrowRight and shrinks 10px on ArrowLeft", async () => {
    const user = userEvent.setup();
    await renderSidePanel();

    const handle = screen.getByRole("slider", { name: "Resize side panel" });
    handle.focus();
    await user.keyboard("{ArrowRight}");

    expect(handle).toHaveAttribute("aria-valuenow", "250");
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "250px" });

    await user.keyboard("{ArrowLeft}");
    expect(handle).toHaveAttribute("aria-valuenow", "240");
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "240px" });
  });

  it("jumps to min on Home and max on End", async () => {
    const user = userEvent.setup();
    await renderSidePanel();

    const handle = screen.getByRole("slider", { name: "Resize side panel" });
    handle.focus();
    await user.keyboard("{Home}");

    expect(handle).toHaveAttribute("aria-valuenow", "160");
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "160px" });

    await user.keyboard("{End}");
    const max = handle.getAttribute("aria-valuemax");
    expect(handle).toHaveAttribute("aria-valuenow", max);
    expect(screen.getByRole("complementary")).toHaveStyle({ width: `${max}px` });
  });

  it("collapses to zero width when open is false and stays mounted", async () => {
    render(
      <ConfigProvider>
        <FileTreeProvider>
          <SidePanel open={false} />
        </FileTreeProvider>
      </ConfigProvider>,
    );
    const aside = await screen.findByRole("complementary", { hidden: true });
    expect(aside).toHaveAttribute("data-slot", "side-panel");
    expect(aside).toHaveAttribute("aria-hidden", "true");
    expect(aside.style.width).toBe("0px");
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
