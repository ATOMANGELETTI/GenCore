import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, type Mock, vi } from "vitest";
import type { TreeRow } from "../../../src/primitives/tree";
import { Tree } from "../../../src/primitives/tree";

const DRIVE: TreeRow = {
  id: "C:\\",
  depth: 0,
  name: "C:",
  expandable: true,
  expanded: true,
  selected: true,
};

const FILE: TreeRow = {
  id: "C:\\readme.txt",
  depth: 1,
  name: "readme.txt",
  expandable: false,
  expanded: false,
  selected: false,
};

const FIXTURE: TreeRow[] = [DRIVE, FILE];

function renderTree({
  rows = FIXTURE,
  onSelect = vi.fn<(id: string) => void>(),
  onToggle = vi.fn<(id: string) => void>(),
  renderLeading,
  renderName,
}: {
  rows?: TreeRow[];
  onSelect?: Mock<(id: string) => void>;
  onToggle?: Mock<(id: string) => void>;
  renderLeading?: (row: TreeRow) => ReactNode;
  renderName?: (row: TreeRow) => ReactNode;
} = {}) {
  const view = render(
    <Tree
      rows={rows}
      onSelect={onSelect}
      onToggle={onToggle}
      renderLeading={renderLeading}
      renderName={renderName}
      className="overflow-auto"
      style={{ height: 200 }}
    />,
  );

  return { onSelect, onToggle, ...view };
}

function tree() {
  return screen.getByRole("tree");
}

function rowNamed(name: string) {
  return screen.getByRole("treeitem", { name });
}

describe("Tree", () => {
  it("renders the two-row fixture with tree semantics", () => {
    renderTree();

    const items = screen.getAllByRole("treeitem");
    expect(tree()).toBeInTheDocument();
    expect(items).toHaveLength(2);

    const drive = rowNamed("C:");
    const file = rowNamed("readme.txt");

    expect(drive).toHaveAttribute("aria-level", "1");
    expect(drive).toHaveAttribute("aria-selected", "true");
    expect(drive).toHaveAttribute("aria-expanded", "true");

    expect(file).toHaveAttribute("aria-level", "2");
    expect(file).toHaveAttribute("aria-selected", "false");
    expect(file).not.toHaveAttribute("aria-expanded");

    expect(drive).toHaveAttribute("data-id", "C:\\");
    expect(file).toHaveAttribute("data-id", "C:\\readme.txt");
  });

  it("calls onSelect when a file row is clicked", async () => {
    const user = userEvent.setup();
    const { onSelect, onToggle } = renderTree();

    await user.click(rowNamed("readme.txt"));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("C:\\readme.txt");
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("calls onToggle once when the folder chevron is clicked", async () => {
    const user = userEvent.setup();
    const { onSelect, onToggle } = renderTree();

    await user.click(within(rowNamed("C:")).getByRole("button", { hidden: true }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("C:\\");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("calls onToggle when an expandable folder row is clicked", async () => {
    const user = userEvent.setup();
    const { onSelect, onToggle } = renderTree();

    await user.click(rowNamed("C:"));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("C:\\");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("selects the next row on ArrowDown from the first row", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTree();

    tree().focus();
    await user.keyboard("{ArrowDown}");

    expect(onSelect).toHaveBeenCalledWith("C:\\readme.txt");
  });

  it("selects the previous row on ArrowUp", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTree({
      rows: [
        { ...DRIVE, selected: false },
        { ...FILE, selected: true },
      ],
    });

    tree().focus();
    await user.keyboard("{ArrowUp}");

    expect(onSelect).toHaveBeenCalledWith("C:\\");
  });

  it("expands a collapsed expandable row on ArrowRight", async () => {
    const user = userEvent.setup();
    const { onSelect, onToggle } = renderTree({
      rows: [{ ...DRIVE, expanded: false }],
    });

    tree().focus();
    await user.keyboard("{ArrowRight}");

    expect(onToggle).toHaveBeenCalledWith("C:\\");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("moves to the next row on ArrowRight when already expanded", async () => {
    const user = userEvent.setup();
    const { onSelect, onToggle } = renderTree();

    tree().focus();
    await user.keyboard("{ArrowRight}");

    expect(onSelect).toHaveBeenCalledWith("C:\\readme.txt");
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("collapses an expanded row on ArrowLeft", async () => {
    const user = userEvent.setup();
    const { onSelect, onToggle } = renderTree();

    tree().focus();
    await user.keyboard("{ArrowLeft}");

    expect(onToggle).toHaveBeenCalledWith("C:\\");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("moves to the parent row on ArrowLeft when the current row is collapsed", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTree({
      rows: [
        { ...DRIVE, selected: false },
        { ...FILE, selected: true },
      ],
    });

    tree().focus();
    await user.keyboard("{ArrowLeft}");

    expect(onSelect).toHaveBeenCalledWith("C:\\");
  });

  it("selects the first and last rows with Home and End", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTree({
      rows: [
        { ...DRIVE, selected: false },
        { ...FILE, selected: true },
      ],
    });

    tree().focus();
    await user.keyboard("{Home}");
    expect(onSelect).toHaveBeenCalledWith("C:\\");

    onSelect.mockClear();
    await user.keyboard("{End}");
    expect(onSelect).toHaveBeenCalledWith("C:\\readme.txt");
  });

  it("selects the current selected row on Enter", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTree();

    tree().focus();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith("C:\\");
  });

  it("sizes, indents, and styles rows", () => {
    renderTree({
      rows: [DRIVE, { ...FILE, muted: true }],
    });

    const drive = rowNamed("C:");
    const file = rowNamed("readme.txt");

    expect(drive).toHaveClass(
      "h-[22px]",
      "select-none",
      "bg-accent",
      "text-accent-foreground",
      "overflow-hidden",
    );
    expect(file).toHaveClass("h-[22px]", "select-none", "opacity-45", "overflow-hidden");
    expect(file).not.toHaveClass("bg-accent");
    expect(drive).toHaveStyle({ paddingLeft: "0px" });
    expect(file).toHaveStyle({ paddingLeft: "16px" });
  });

  it("renders an 8px chevron that rotates when expanded", () => {
    const { rerender, onSelect, onToggle } = renderTree();

    const expanded = within(rowNamed("C:")).getByRole("button", { hidden: true });
    expect(expanded).toHaveClass("size-2");
    expect(expanded).toHaveClass("duration-150");
    expect(expanded).toHaveClass("motion-reduce:transition-none");
    expect(expanded).toHaveClass("rotate-90");

    rerender(
      <Tree
        rows={[{ ...DRIVE, expanded: false }]}
        onSelect={onSelect}
        onToggle={onToggle}
        className="overflow-auto"
        style={{ height: 200 }}
      />,
    );

    const collapsed = within(rowNamed("C:")).getByRole("button", { hidden: true });
    expect(collapsed).not.toHaveClass("rotate-90");
  });

  it("does not clip overflowVisible rows", () => {
    renderTree({
      rows: [{ ...FILE, overflowVisible: true }],
    });

    const row = rowNamed("readme.txt");
    expect(row).toHaveClass("overflow-visible", "z-20");
    expect(row).not.toHaveClass("overflow-hidden");
    expect(row.querySelector("[data-slot='tree-name']")).not.toHaveClass("truncate");
  });

  it("renders leading and name slots without defaulting the name", () => {
    renderTree({
      renderLeading: (row) => <span data-testid={`leading-${row.id}`}>{row.name}-icon</span>,
      renderName: (row) => <span className="select-text">{row.name}-custom</span>,
    });

    expect(screen.getByTestId("leading-C:\\")).toHaveTextContent("C:-icon");
    expect(screen.getByText("C:-custom")).toHaveClass("select-text");
    expect(screen.queryByText("readme.txt")).not.toBeInTheDocument();
    expect(screen.getByText("readme.txt-custom")).toBeInTheDocument();
  });
});
