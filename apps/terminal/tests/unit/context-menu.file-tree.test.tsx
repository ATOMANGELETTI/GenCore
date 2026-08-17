import { ContextMenu, ContextMenuTrigger } from "@gencore/ui-kit";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  FileTreeContextMenu,
  type FileTreeContextMenuProps,
} from "../../src/modules/context-menu/context-menu.file-tree";

function handlers() {
  return {
    onExpand: vi.fn(),
    onCollapse: vi.fn(),
    onNewFile: vi.fn(),
    onNewFolder: vi.fn(),
    onRefresh: vi.fn(),
    onCopyPath: vi.fn(),
    onCollapseAll: vi.fn(),
  };
}

async function openMenu(user: ReturnType<typeof userEvent.setup>, props: FileTreeContextMenuProps) {
  render(
    <ContextMenu>
      <ContextMenuTrigger>
        <span>Tree</span>
      </ContextMenuTrigger>
      <FileTreeContextMenu {...props} />
    </ContextMenu>,
  );
  await user.pointer({ keys: "[MouseRight]", target: screen.getByText("Tree") });
}

describe("FileTreeContextMenu", () => {
  it("shows Refresh and Collapse All on blank area", async () => {
    const user = userEvent.setup();
    const props = { kind: "blank" as const, expanded: false, ...handlers() };
    await openMenu(user, props);

    expect(await screen.findByRole("menuitem", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Collapse All" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "New File" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Copy Path" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Expand" })).not.toBeInTheDocument();
  });

  it("shows Collapse for an expanded folder and calls onNewFile", async () => {
    const user = userEvent.setup();
    const props = { kind: "dir" as const, expanded: true, ...handlers() };
    await openMenu(user, props);

    expect(await screen.findByRole("menuitem", { name: "Collapse" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Expand" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "New File" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "New Folder" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy Path" })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "New File" }));
    expect(props.onNewFile).toHaveBeenCalledTimes(1);
  });

  it("shows Expand for a collapsed drive", async () => {
    const user = userEvent.setup();
    await openMenu(user, { kind: "drive", expanded: false, ...handlers() });
    expect(await screen.findByRole("menuitem", { name: "Expand" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Collapse" })).not.toBeInTheDocument();
  });

  it("omits Expand/Collapse for a file", async () => {
    const user = userEvent.setup();
    await openMenu(user, { kind: "file", expanded: false, ...handlers() });
    expect(await screen.findByRole("menuitem", { name: "New File" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy Path" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Expand" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Collapse" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Collapse All" })).not.toBeInTheDocument();
  });
});
