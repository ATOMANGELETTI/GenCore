import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/ipc/ipc.git", () => ({
  gitGetStatus: vi.fn((path: string) =>
    Promise.resolve({
      is_repo: path === "C:\\valid-repo",
      root_path: path,
      branch: path === "C:\\valid-repo" ? "main" : null,
      upstream: "origin/main",
      ahead: 2,
      behind: 1,
      staged:
        path === "C:\\valid-repo"
          ? [{ path: "src/staged.ts", status: "added", additions: 5, deletions: 0 }]
          : [],
      unstaged:
        path === "C:\\valid-repo"
          ? [{ path: "src/modified.ts", status: "modified", additions: 3, deletions: 2 }]
          : [],
      untracked: path === "C:\\valid-repo" ? ["untracked.txt"] : [],
      conflicted: [],
    }),
  ),
  gitPickFolder: vi.fn(() => Promise.resolve("C:\\valid-repo")),
  gitInitRepo: vi.fn(() => Promise.resolve({ root_path: "C:\\new-repo", default_branch: "main" })),
  gitListBranches: vi.fn(() =>
    Promise.resolve([
      { name: "main", is_current: true, is_remote: false },
      { name: "feature-branch", is_current: false, is_remote: false },
    ]),
  ),
  gitGetLog: vi.fn(() =>
    Promise.resolve([
      {
        id: "commit123456",
        short_id: "commit1",
        summary: "feat: core functionality",
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
    Promise.resolve({ id: "commit999", short_id: "commit9", summary: "feat: commit" }),
  ),
  gitCheckoutBranch: vi.fn(() => Promise.resolve()),
  gitCreateBranch: vi.fn(() => Promise.resolve()),
  gitStashSave: vi.fn(() => Promise.resolve()),
  gitStashPop: vi.fn(() => Promise.resolve()),
}));

import {
  gitCommit,
  gitInitRepo,
  gitPickFolder,
  gitStageAll,
  gitUnstageAll,
} from "../../src/modules/ipc/ipc.git";
import { SourceControl } from "../../src/modules/source-control/source-control.component";

restoreJsdomLocalStorage();

describe("SourceControl Views", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("NoFolderView", () => {
    it("renders empty state and allows picking a folder", async () => {
      const user = userEvent.setup();
      render(<SourceControl />);

      expect(await screen.findByText(/No Folder Opened/i)).toBeVisible();
      expect(screen.getByText(/You have not yet opened a folder/i)).toBeInTheDocument();

      const openButton = screen.getByRole("button", { name: /Open Folder/i });
      await user.click(openButton);

      expect(gitPickFolder).toHaveBeenCalled();
    });
  });

  describe("InitRepoView", () => {
    it("renders uninitialized state and allows initializing repo", async () => {
      localStorage.setItem("gencore:files:workspace-folder", "C:\\new-repo");
      const user = userEvent.setup();
      render(<SourceControl />);

      expect(await screen.findByText(/Not a Git Repository/i)).toBeVisible();
      expect(screen.getByText("new-repo")).toBeInTheDocument();

      const initButton = screen.getByRole("button", { name: /Initialize Repository/i });
      await user.click(initButton);

      expect(gitInitRepo).toHaveBeenCalledWith("C:\\new-repo");
    });
  });

  describe("ActiveRepoView", () => {
    it("renders active repository state with branches, staged, unstaged, and untracked changes", async () => {
      localStorage.setItem("gencore:files:workspace-folder", "C:\\valid-repo");
      render(<SourceControl />);

      expect(await screen.findByText("main")).toBeVisible();
      expect(screen.getByTitle("2 commit(s) ahead")).toBeInTheDocument();
      expect(screen.getByTitle("1 commit(s) behind")).toBeInTheDocument();

      expect(screen.getByText(/Staged Changes/i)).toBeInTheDocument();
      expect(screen.getByText("src/staged.ts")).toBeInTheDocument();

      expect(screen.getByText(/^Changes$/i)).toBeInTheDocument();
      expect(screen.getByText("src/modified.ts")).toBeInTheDocument();

      expect(screen.getByText(/^Untracked$/i)).toBeInTheDocument();
      expect(screen.getByText("untracked.txt")).toBeInTheDocument();
    });

    it("allows entering commit message and committing staged changes", async () => {
      localStorage.setItem("gencore:files:workspace-folder", "C:\\valid-repo");
      const user = userEvent.setup();
      render(<SourceControl />);

      expect(await screen.findByText("src/staged.ts")).toBeVisible();

      const input = screen.getByPlaceholderText(/Message \(Ctrl\+Enter to commit\)/i);
      await user.type(input, "feat: implement feature");

      const commitButton = screen.getByRole("button", { name: /^Commit$/i });
      expect(commitButton).not.toBeDisabled();
      await user.click(commitButton);

      expect(gitCommit).toHaveBeenCalledWith("C:\\valid-repo", "feat: implement feature", false);
    });

    it("generates AI commit message using the sparkles button", async () => {
      localStorage.setItem("gencore:files:workspace-folder", "C:\\valid-repo");
      const user = userEvent.setup();
      render(<SourceControl />);

      expect(await screen.findByText("src/staged.ts")).toBeVisible();

      const aiButton = screen.getByRole("button", { name: /Generate AI Commit Message/i });
      await user.click(aiButton);

      const input = screen.getByPlaceholderText(
        /Message \(Ctrl\+Enter to commit\)/i,
      ) as HTMLTextAreaElement;
      expect(input.value).toMatch(/^feat: add /);
    });

    it("unstage all and stage all buttons call respective IPC functions", async () => {
      localStorage.setItem("gencore:files:workspace-folder", "C:\\valid-repo");
      const user = userEvent.setup();
      render(<SourceControl />);

      expect(await screen.findByText("src/staged.ts")).toBeVisible();

      const unstageAllBtn = screen.getByRole("button", { name: /Unstage all/i });
      await user.click(unstageAllBtn);
      expect(gitUnstageAll).toHaveBeenCalledWith("C:\\valid-repo");

      const stageAllBtn = screen.getByRole("button", { name: /Stage all changes/i });
      await user.click(stageAllBtn);
      expect(gitStageAll).toHaveBeenCalledWith("C:\\valid-repo");
    });
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
