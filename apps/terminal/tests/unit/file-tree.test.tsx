import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DriveEntry, FsEntry } from "../../src/modules/ipc/ipc.types";

const { listDrives, listDir, createFile, createDir, watchDir, unwatchDir, subscribeFsChanges } =
  vi.hoisted(() => ({
    listDrives: vi.fn(),
    listDir: vi.fn(),
    createFile: vi.fn(),
    createDir: vi.fn(),
    watchDir: vi.fn(),
    unwatchDir: vi.fn(),
    subscribeFsChanges: vi.fn(),
  }));

vi.mock("../../src/modules/ipc/ipc.fs", () => ({
  listDrives,
  listDir,
  createFile,
  createDir,
  watchDir,
  unwatchDir,
  subscribeFsChanges,
}));

import { FileTree } from "../../src/modules/file-tree/file-tree.component";

const DRIVES: DriveEntry[] = [
  { name: "C:", path: "C:\\", kind: "fixed", label: "System" },
  { name: "D:", path: "D:\\", kind: "fixed", label: null },
];

const C_CHILDREN: { entries: FsEntry[] } = {
  entries: [
    {
      name: "Windows",
      path: "C:\\Windows",
      kind: "dir",
      extension: null,
      hidden: false,
      system: false,
    },
    {
      name: ".hidden",
      path: "C:\\.hidden",
      kind: "file",
      extension: null,
      hidden: true,
      system: false,
    },
    {
      name: "readme.txt",
      path: "C:\\readme.txt",
      kind: "file",
      extension: "txt",
      hidden: false,
      system: false,
    },
  ],
};

function mockFs() {
  listDrives.mockResolvedValue(DRIVES);
  listDir.mockResolvedValue(C_CHILDREN);
  createFile.mockResolvedValue(undefined);
  createDir.mockResolvedValue(undefined);
  watchDir.mockResolvedValue(undefined);
  unwatchDir.mockResolvedValue(undefined);
  subscribeFsChanges.mockResolvedValue(() => {});
}

async function renderTree() {
  const user = userEvent.setup();
  const view = render(<FileTree />);
  expect(await screen.findByText("C:")).toBeVisible();
  expect(screen.getByText("D:")).toBeVisible();
  return { user, ...view };
}

function toolbar() {
  return screen.getByText("FILES").parentElement as HTMLElement;
}

describe("FileTree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs();
  });

  it("renders FILES and four labeled buttons", async () => {
    await renderTree();

    expect(screen.getByText("FILES")).toBeVisible();
    expect(screen.getByText("FILES")).toHaveClass(
      "text-[10px]",
      "font-semibold",
      "uppercase",
      "tracking-wide",
      "text-muted-foreground",
    );
    expect(toolbar()).toHaveClass(
      "h-7",
      "border-b",
      "border-border",
      "px-2",
      "flex",
      "items-center",
      "justify-between",
      "select-none",
    );
    expect(screen.getByRole("button", { name: "New File" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Folder" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse All" })).toBeInTheDocument();
  });

  it("shows mocked C:\\ and D:\\ drive names", async () => {
    await renderTree();

    expect(screen.getByRole("treeitem", { name: /^C:/ })).toBeVisible();
    expect(screen.getByRole("treeitem", { name: "D:" })).toBeVisible();
    expect(screen.getByText("System")).toHaveClass("text-muted-foreground");
  });

  it("lists mocked children when C: is expanded", async () => {
    const { user } = await renderTree();

    await user.click(screen.getByRole("treeitem", { name: /^C:/ }));

    expect(await screen.findByText("Windows")).toBeVisible();
    expect(screen.getByText(".hidden")).toBeVisible();
    expect(screen.getByText("readme.txt")).toBeVisible();
    expect(listDir).toHaveBeenCalledWith("C:\\");
    expect(watchDir).toHaveBeenCalledWith("C:\\");
    const listOrder = listDir.mock.invocationCallOrder[0] ?? 0;
    const watchOrder = watchDir.mock.invocationCallOrder[0] ?? 0;
    expect(listOrder).toBeLessThan(watchOrder);
  });

  it("dims a hidden child with opacity-45", async () => {
    const { user } = await renderTree();

    await user.click(screen.getByRole("treeitem", { name: /^C:/ }));

    expect(await screen.findByRole("treeitem", { name: ".hidden" })).toHaveClass("opacity-45");
    expect(screen.getByRole("treeitem", { name: "readme.txt" })).not.toHaveClass("opacity-45");
  });

  it("disables New File until a row is selected", async () => {
    const { user } = await renderTree();

    expect(screen.getByRole("button", { name: "New File" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "New Folder" })).toBeDisabled();

    await user.click(screen.getByRole("treeitem", { name: /^C:/ }));

    expect(screen.getByRole("button", { name: "New File" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "New Folder" })).toBeEnabled();
  });

  it("creates a file as a child of the selected folder", async () => {
    const { user } = await renderTree();

    await user.click(screen.getByRole("treeitem", { name: /^C:/ }));
    await screen.findByText("Windows");
    await user.click(screen.getByRole("button", { name: "New File" }));

    const input = screen.getByRole("textbox");
    expect(input).toHaveFocus();
    await user.type(input, "a.txt");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(createFile).toHaveBeenCalledWith("C:\\a.txt");
    });
    expect(createFile).toHaveBeenCalledTimes(1);
    expect(listDir.mock.calls.filter((call) => call[0] === "C:\\").length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("creates a file as a sibling of the selected file", async () => {
    const { user } = await renderTree();

    await user.click(screen.getByRole("treeitem", { name: /^C:/ }));
    await user.click(await screen.findByRole("treeitem", { name: "readme.txt" }));
    await user.click(screen.getByRole("button", { name: "New File" }));
    await user.type(screen.getByRole("textbox"), "b.txt");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(createFile).toHaveBeenCalledWith("C:\\b.txt");
    });
    expect(createFile).toHaveBeenCalledTimes(1);
  });

  it("lists drives and subscribes to fs changes on mount, and unlistens on unmount", async () => {
    const unlisten = vi.fn();
    subscribeFsChanges.mockResolvedValue(unlisten);
    const { unmount } = await renderTree();

    expect(listDrives).toHaveBeenCalledTimes(1);
    expect(subscribeFsChanges).toHaveBeenCalledTimes(1);

    unmount();
    await waitFor(() => {
      expect(unlisten).toHaveBeenCalledTimes(1);
    });
  });

  it("re-lists an expanded parent when a watch event fires", async () => {
    let onChange: ((payload: { parent: string; kind: string }) => void) | undefined;
    subscribeFsChanges.mockImplementation(async (handler) => {
      onChange = handler;
      return () => {};
    });
    const { user } = await renderTree();

    await user.click(screen.getByRole("treeitem", { name: /^C:/ }));
    await screen.findByText("Windows");
    listDir.mockClear();

    onChange?.({ parent: "C:\\", kind: "created" });

    await waitFor(() => {
      expect(listDir).toHaveBeenCalledWith("C:\\");
    });
  });

  it("hides children on collapse all while keeping drive roots", async () => {
    const { user } = await renderTree();

    await user.click(screen.getByRole("treeitem", { name: /^C:/ }));
    expect(await screen.findByText("Windows")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Collapse All" }));

    expect(screen.queryByText("Windows")).not.toBeInTheDocument();
    expect(screen.getByText("C:")).toBeVisible();
    expect(screen.getByText("D:")).toBeVisible();
    expect(unwatchDir).toHaveBeenCalledWith("C:\\");
  });

  it("spins the refresh icon while a refresh is in flight", async () => {
    const { user } = await renderTree();
    let resolveRefresh: (value: DriveEntry[]) => void = () => {};
    listDrives.mockReturnValueOnce(
      new Promise<DriveEntry[]>((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    const icon = screen.getByRole("button", { name: "Refresh" }).querySelector("svg");
    expect(icon).toHaveClass("animate-spin");
    expect(icon).toHaveClass("motion-reduce:animate-none");

    resolveRefresh(DRIVES);
    await waitFor(() => {
      expect(icon).not.toHaveClass("animate-spin");
    });
    expect(listDrives).toHaveBeenCalledTimes(2);
  });
});
