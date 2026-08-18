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

import { SidePanel } from "../../src/modules/side-panel/side-panel.component";

function getTabpanel(id: "files" | "assistant" | "settings") {
  const panel = document.getElementById(`side-panel-${id}`);
  expect(panel).toBeTruthy();
  return panel as HTMLElement;
}

function expectPanelHiddenState(id: "files" | "assistant" | "settings", isHidden: boolean) {
  const panel = getTabpanel(id);
  if (isHidden) {
    expect(panel).toHaveAttribute("hidden");
  } else {
    expect(panel).not.toHaveAttribute("hidden");
  }
  expect(panel).not.toHaveClass("flex");
}

async function renderSidePanel() {
  const view = render(<SidePanel />);
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
    expect(screen.getByText("Tab 2")).not.toBeVisible();
    expect(screen.getByText("Tab 3")).not.toBeVisible();
    expectPanelHiddenState("files", false);
    expectPanelHiddenState("assistant", true);
    expectPanelHiddenState("settings", true);
  });

  it("shows Tab 2 when the Assistant tab is clicked", async () => {
    const user = userEvent.setup();
    await renderSidePanel();

    await user.click(screen.getByRole("tab", { name: "Assistant" }));

    expect(screen.getByText("Tab 2")).toBeVisible();
    expect(screen.queryByText("Tab 1")).toBeNull();
    expect(screen.getByText("Tab 3")).not.toBeVisible();
    expectPanelHiddenState("assistant", false);
    expectPanelHiddenState("files", true);
    expectPanelHiddenState("settings", true);
  });

  it("shows Tab 3 when the Settings tab is clicked", async () => {
    const user = userEvent.setup();
    await renderSidePanel();

    await user.click(screen.getByRole("tab", { name: "Settings" }));

    expect(screen.getByText("Tab 3")).toBeVisible();
    expect(screen.queryByText("Tab 1")).toBeNull();
    expect(screen.getByText("Tab 2")).not.toBeVisible();
    expectPanelHiddenState("settings", false);
    expectPanelHiddenState("files", true);
    expectPanelHiddenState("assistant", true);
  });

  it("exposes a Side panel tablist with Files, Assistant, and Settings tabs", async () => {
    await renderSidePanel();

    const tablist = screen.getByRole("tablist", { name: "Side panel" });
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveClass("h-6");
    expect(screen.getByRole("tab", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Assistant" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settings" })).toBeInTheDocument();

    for (const name of ["Files", "Assistant", "Settings"] as const) {
      const icon = screen.getByRole("tab", { name }).querySelector("svg");
      expect(icon).toHaveClass("size-3");
    }
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
});
