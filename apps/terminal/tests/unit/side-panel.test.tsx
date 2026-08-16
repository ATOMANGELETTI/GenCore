import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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

describe("SidePanel", () => {
  it("shows Tab 1 by default and hides the other panels", () => {
    render(<SidePanel />);

    expect(screen.getByText("Tab 1")).toBeVisible();
    expect(screen.getByText("Tab 2")).not.toBeVisible();
    expect(screen.getByText("Tab 3")).not.toBeVisible();
    expectPanelHiddenState("files", false);
    expectPanelHiddenState("assistant", true);
    expectPanelHiddenState("settings", true);
  });

  it("shows Tab 2 when the Assistant tab is clicked", async () => {
    const user = userEvent.setup();
    render(<SidePanel />);

    await user.click(screen.getByRole("tab", { name: "Assistant" }));

    expect(screen.getByText("Tab 2")).toBeVisible();
    expect(screen.getByText("Tab 1")).not.toBeVisible();
    expect(screen.getByText("Tab 3")).not.toBeVisible();
    expectPanelHiddenState("assistant", false);
    expectPanelHiddenState("files", true);
    expectPanelHiddenState("settings", true);
  });

  it("shows Tab 3 when the Settings tab is clicked", async () => {
    const user = userEvent.setup();
    render(<SidePanel />);

    await user.click(screen.getByRole("tab", { name: "Settings" }));

    expect(screen.getByText("Tab 3")).toBeVisible();
    expect(screen.getByText("Tab 1")).not.toBeVisible();
    expect(screen.getByText("Tab 2")).not.toBeVisible();
    expectPanelHiddenState("settings", false);
    expectPanelHiddenState("files", true);
    expectPanelHiddenState("assistant", true);
  });

  it("exposes a Side panel tablist with Files, Assistant, and Settings tabs", () => {
    render(<SidePanel />);

    expect(screen.getByRole("tablist", { name: "Side panel" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Assistant" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders an aside complementary root with the side-panel slot", () => {
    render(<SidePanel />);

    const root = screen.getByRole("complementary");
    expect(root.tagName).toBe("ASIDE");
    expect(root).toHaveAttribute("data-slot", "side-panel");
  });
});
