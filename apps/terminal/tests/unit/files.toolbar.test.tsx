import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilesToolbar } from "../../src/modules/files/files.toolbar";

describe("FilesToolbar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Explorer and Source Control tabs and overflow button", () => {
    const onSelect = vi.fn();
    render(<FilesToolbar activeSubview="explorer" onSelectSubview={onSelect} />);

    expect(screen.getByRole("tab", { name: /^Explorer/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /^Source Control/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("button", { name: /Files actions/i })).toBeInTheDocument();
  });

  it("displays changes badge when changesCount > 0", () => {
    const onSelect = vi.fn();
    render(<FilesToolbar activeSubview="explorer" onSelectSubview={onSelect} changesCount={5} />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls onSelectSubview when a category tab is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<FilesToolbar activeSubview="explorer" onSelectSubview={onSelect} />);

    await user.click(screen.getByRole("tab", { name: /^Source Control/i }));
    expect(onSelect).toHaveBeenCalledWith("source-control");
  });

  it("supports keyboard navigation between tabs", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<FilesToolbar activeSubview="explorer" onSelectSubview={onSelect} />);

    const explorerTab = screen.getByRole("tab", { name: /^Explorer/i });
    explorerTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(onSelect).toHaveBeenCalledWith("source-control");
  });

  it("opens dropdown and shows Open Folder and Refresh", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onOpenFolder = vi.fn();
    const onRefresh = vi.fn();

    render(
      <FilesToolbar
        activeSubview="explorer"
        onSelectSubview={onSelect}
        onOpenFolder={onOpenFolder}
        onRefresh={onRefresh}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Files actions/i }));
    const openFolderItem = await screen.findByRole("menuitem", { name: /^Open Folder\.\.\.$/i });
    await user.click(openFolderItem);
    expect(onOpenFolder).toHaveBeenCalled();
  });

  it("shows source control actions in dropdown when in source-control subview", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onStageAll = vi.fn();
    const onUnstageAll = vi.fn();

    render(
      <FilesToolbar
        activeSubview="source-control"
        onSelectSubview={onSelect}
        onStageAll={onStageAll}
        onUnstageAll={onUnstageAll}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Files actions/i }));
    const stageAllItem = await screen.findByRole("menuitem", { name: /^Stage All Changes$/i });
    await user.click(stageAllItem);
    expect(onStageAll).toHaveBeenCalled();
  });
});
