import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/ipc/ipc.git", () => ({
  gitGetStatus: vi.fn((path: string) =>
    Promise.resolve({
      is_repo: path === "C:\\valid-repo",
      root_path: path,
      branch: path === "C:\\valid-repo" ? "main" : null,
      upstream: "origin/main",
      ahead: 1,
      behind: 0,
      staged:
        path === "C:\\valid-repo"
          ? [{ path: "file1.ts", status: "modified", additions: 2, deletions: 1 }]
          : [],
      unstaged:
        path === "C:\\valid-repo"
          ? [{ path: "file2.ts", status: "modified", additions: 1, deletions: 0 }]
          : [],
      untracked: path === "C:\\valid-repo" ? ["file3.ts"] : [],
      conflicted: [],
    }),
  ),
  gitPickFolder: vi.fn(() => Promise.resolve("C:\\valid-repo")),
  gitInitRepo: vi.fn(() => Promise.resolve({ root_path: "C:\\new-repo", default_branch: "main" })),
  gitListBranches: vi.fn(() =>
    Promise.resolve([
      { name: "main", is_current: true, is_remote: false },
      { name: "feature", is_current: false, is_remote: false },
    ]),
  ),
  gitGetLog: vi.fn(() =>
    Promise.resolve([
      {
        id: "abc123456789",
        short_id: "abc1234",
        summary: "feat: initial commit",
        author_name: "Developer",
        author_email: "dev@example.com",
        timestamp: 1700000000,
        parents: [],
        refs: ["HEAD", "main"],
      },
    ]),
  ),
  gitStageFile: vi.fn(() => Promise.resolve()),
  gitUnstageFile: vi.fn(() => Promise.resolve()),
  gitStageAll: vi.fn(() => Promise.resolve()),
  gitUnstageAll: vi.fn(() => Promise.resolve()),
  gitDiscardChanges: vi.fn(() => Promise.resolve()),
  gitCommit: vi.fn(() =>
    Promise.resolve({ id: "def456789", short_id: "def4567", summary: "feat: commit" }),
  ),
  gitCheckoutBranch: vi.fn(() => Promise.resolve()),
  gitCreateBranch: vi.fn(() => Promise.resolve()),
  gitStashSave: vi.fn(() => Promise.resolve()),
  gitStashPop: vi.fn(() => Promise.resolve()),
}));

import {
  gitCheckoutBranch,
  gitCommit,
  gitCreateBranch,
  gitDiscardChanges,
  gitInitRepo,
  gitPickFolder,
  gitStageAll,
  gitStageFile,
  gitStashPop,
  gitStashSave,
  gitUnstageAll,
  gitUnstageFile,
} from "../../src/modules/ipc/ipc.git";
import {
  SourceControlProvider,
  useSourceControlContext,
} from "../../src/modules/source-control/source-control.hook";

restoreJsdomLocalStorage();

describe("useSourceControlContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("throws when accessed outside of SourceControlProvider", () => {
    expect(() => renderHook(() => useSourceControlContext())).toThrow(
      "useSourceControlContext must be used within a SourceControlProvider",
    );
  });

  it("initializes with empty state when no folder is open", async () => {
    const { result } = renderHook(() => useSourceControlContext(), {
      wrapper: SourceControlProvider,
    });

    await act(async () => {});

    expect(result.current.folderPath).toBeNull();
    expect(result.current.isGitRepo).toBe(false);
    expect(result.current.branch).toBeNull();
    expect(result.current.stagedFiles).toEqual([]);
  });

  it("opens folder picker and loads git status for valid repo", async () => {
    const { result } = renderHook(() => useSourceControlContext(), {
      wrapper: SourceControlProvider,
    });

    await act(async () => {
      await result.current.openFolderPicker();
    });

    expect(gitPickFolder).toHaveBeenCalled();
    expect(result.current.folderPath).toBe("C:\\valid-repo");
    expect(result.current.isGitRepo).toBe(true);
    expect(result.current.branch).toBe("main");
    expect(result.current.stagedFiles.length).toBe(1);
    expect(result.current.unstagedFiles.length).toBe(1);
    expect(result.current.untrackedFiles.length).toBe(1);
    expect(result.current.ahead).toBe(1);
    expect(result.current.branches.length).toBe(2);
    expect(result.current.commits.length).toBe(1);
  });

  it("invokes gitInitRepo and refreshes status", async () => {
    localStorage.setItem("gencore:files:workspace-folder", "C:\\new-repo");
    const { result } = renderHook(() => useSourceControlContext(), {
      wrapper: SourceControlProvider,
    });

    await act(async () => {
      await result.current.initRepo();
    });

    expect(gitInitRepo).toHaveBeenCalledWith("C:\\new-repo");
  });

  it("stages and unstages files", async () => {
    localStorage.setItem("gencore:files:workspace-folder", "C:\\valid-repo");
    const { result } = renderHook(() => useSourceControlContext(), {
      wrapper: SourceControlProvider,
    });

    await act(async () => {
      await result.current.stageFile("file2.ts");
    });
    expect(gitStageFile).toHaveBeenCalledWith("C:\\valid-repo", "file2.ts");

    await act(async () => {
      await result.current.unstageFile("file1.ts");
    });
    expect(gitUnstageFile).toHaveBeenCalledWith("C:\\valid-repo", "file1.ts");

    await act(async () => {
      await result.current.stageAll();
    });
    expect(gitStageAll).toHaveBeenCalledWith("C:\\valid-repo");

    await act(async () => {
      await result.current.unstageAll();
    });
    expect(gitUnstageAll).toHaveBeenCalledWith("C:\\valid-repo");
  });

  it("creates commits and branches", async () => {
    localStorage.setItem("gencore:files:workspace-folder", "C:\\valid-repo");
    const { result } = renderHook(() => useSourceControlContext(), {
      wrapper: SourceControlProvider,
    });

    await act(async () => {
      await result.current.commit("feat: my commit");
    });
    expect(gitCommit).toHaveBeenCalledWith("C:\\valid-repo", "feat: my commit", false);

    await act(async () => {
      await result.current.createBranch("feature-1");
    });
    expect(gitCreateBranch).toHaveBeenCalledWith("C:\\valid-repo", "feature-1");

    await act(async () => {
      await result.current.checkoutBranch("feature-1");
    });
    expect(gitCheckoutBranch).toHaveBeenCalledWith("C:\\valid-repo", "feature-1");
  });

  it("discards changes and performs stash operations", async () => {
    localStorage.setItem("gencore:files:workspace-folder", "C:\\valid-repo");
    const { result } = renderHook(() => useSourceControlContext(), {
      wrapper: SourceControlProvider,
    });

    await act(async () => {
      await result.current.discardChanges("file2.ts");
    });
    expect(gitDiscardChanges).toHaveBeenCalledWith("C:\\valid-repo", "file2.ts");

    await act(async () => {
      await result.current.stashSave("wip");
    });
    expect(gitStashSave).toHaveBeenCalledWith("C:\\valid-repo", "wip");

    await act(async () => {
      await result.current.stashPop(0);
    });
    expect(gitStashPop).toHaveBeenCalledWith("C:\\valid-repo", 0);
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
