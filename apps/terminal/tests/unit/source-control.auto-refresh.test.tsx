import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/ipc/ipc.git", () => ({
  gitGetStatus: vi.fn((path: string) =>
    Promise.resolve({
      is_repo: path === "C:\\valid-repo",
      root_path: path,
      branch: "main",
      upstream: "origin/main",
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [{ path: "file1.ts", status: "modified", additions: 1, deletions: 0 }],
      untracked: [],
      conflicted: [],
    }),
  ),
  gitPickFolder: vi.fn(() => Promise.resolve("C:\\another-repo")),
  gitInitRepo: vi.fn(() => Promise.resolve({ root_path: "C:\\new-repo", default_branch: "main" })),
  gitListBranches: vi.fn(() =>
    Promise.resolve([{ name: "main", is_current: true, is_remote: false }]),
  ),
  gitGetLog: vi.fn(() => Promise.resolve([])),
  gitStageFile: vi.fn(() => Promise.resolve()),
  gitUnstageFile: vi.fn(() => Promise.resolve()),
  gitStageAll: vi.fn(() => Promise.resolve()),
  gitUnstageAll: vi.fn(() => Promise.resolve()),
  gitDiscardChanges: vi.fn(() => Promise.resolve()),
  gitCommit: vi.fn(() => Promise.resolve({ id: "123", short_id: "123", summary: "test" })),
  gitCheckoutBranch: vi.fn(() => Promise.resolve()),
  gitCreateBranch: vi.fn(() => Promise.resolve()),
  gitStashSave: vi.fn(() => Promise.resolve()),
  gitStashPop: vi.fn(() => Promise.resolve()),
}));

import { gitGetStatus, gitPickFolder } from "../../src/modules/ipc/ipc.git";
import {
  SourceControlProvider,
  useSourceControlContext,
} from "../../src/modules/source-control/source-control.hook";
import { ActiveRepoView } from "../../src/modules/source-control/views/active-repo-view.component";

restoreJsdomLocalStorage();

describe("Source Control auto-refresh and Open Repo header button", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("polls git status periodically in background", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.setItem("gencore:files:workspace-folder", "C:\\valid-repo");

    renderHook(() => useSourceControlContext(), {
      wrapper: SourceControlProvider,
    });

    await waitFor(() => {
      expect(gitGetStatus).toHaveBeenCalledWith("C:\\valid-repo");
    });

    const initialCallCount = vi.mocked(gitGetStatus).mock.calls.length;

    // Advance 3 seconds to trigger polling
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(vi.mocked(gitGetStatus).mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it("refreshes git status on window focus event", async () => {
    localStorage.setItem("gencore:files:workspace-folder", "C:\\valid-repo");

    renderHook(() => useSourceControlContext(), {
      wrapper: SourceControlProvider,
    });

    await waitFor(() => {
      expect(gitGetStatus).toHaveBeenCalledWith("C:\\valid-repo");
    });

    const callCountBeforeFocus = vi.mocked(gitGetStatus).mock.calls.length;

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => {
      expect(vi.mocked(gitGetStatus).mock.calls.length).toBeGreaterThan(callCountBeforeFocus);
    });
  });

  it("renders Open Repository button in ActiveRepoView header and opens folder picker", async () => {
    const user = userEvent.setup();
    localStorage.setItem("gencore:files:workspace-folder", "C:\\valid-repo");

    render(
      <SourceControlProvider>
        <ActiveRepoView />
      </SourceControlProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("main")).toBeInTheDocument();
    });

    const openRepoBtn = screen.getByLabelText("Open repository");
    expect(openRepoBtn).toBeInTheDocument();

    await user.click(openRepoBtn);
    expect(gitPickFolder).toHaveBeenCalledTimes(1);
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
