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

vi.mock("../../src/modules/ipc/ipc.git", () => ({
  gitGetStatus: vi.fn(() =>
    Promise.resolve({
      is_repo: false,
      branch: null,
      staged: [],
      unstaged: [],
      untracked: [],
      ahead: 0,
      behind: 0,
    }),
  ),
  gitPickFolder: vi.fn(() => Promise.resolve("C:\\repo")),
  gitInitRepo: vi.fn(() => Promise.resolve()),
  gitListBranches: vi.fn(() => Promise.resolve([])),
  gitGetLog: vi.fn(() => Promise.resolve([])),
}));

import { FileTreeProvider } from "../../src/modules/file-tree/file-tree.hook";
import { Files } from "../../src/modules/files/files.component";

restoreJsdomLocalStorage();

describe("Files", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders toolbar with Explorer and Source Control tabs, defaulting to Explorer", async () => {
    render(
      <FileTreeProvider>
        <Files />
      </FileTreeProvider>,
    );

    expect(screen.getByRole("tab", { name: /^Explorer/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /^Source Control/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(await screen.findByText("FILES")).toBeVisible();
    expect(await screen.findByRole("treeitem", { name: "C:" })).toBeVisible();
  });

  it("switches to Source Control subview when tab is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FileTreeProvider>
        <Files />
      </FileTreeProvider>,
    );

    await user.click(screen.getByRole("tab", { name: /^Source Control/i }));

    expect(screen.getByRole("tab", { name: /^Source Control/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByText(/No Folder Opened/i)).toBeVisible();
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
