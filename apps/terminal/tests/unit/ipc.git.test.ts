import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock,
}));

describe("ipc.git", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("invokes git_get_status with path", async () => {
    const { gitGetStatus } = await import("../../src/modules/ipc/ipc.git");
    const mockStatus = {
      is_repo: true,
      root_path: "C:\\repo",
      branch: "main",
      upstream: null,
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
    };
    invokeMock.mockResolvedValueOnce(mockStatus);

    const res = await gitGetStatus("C:\\repo");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_get_status", {
      path: "C:\\repo",
    });
    expect(res).toEqual(mockStatus);
  });

  it("invokes git_init_repo with path", async () => {
    const { gitInitRepo } = await import("../../src/modules/ipc/ipc.git");
    const mockInit = { root_path: "C:\\repo", default_branch: "main" };
    invokeMock.mockResolvedValueOnce(mockInit);

    const res = await gitInitRepo("C:\\repo");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_init_repo", {
      path: "C:\\repo",
    });
    expect(res).toEqual(mockInit);
  });

  it("invokes git_stage_file with repo_path and file_path", async () => {
    const { gitStageFile } = await import("../../src/modules/ipc/ipc.git");
    invokeMock.mockResolvedValueOnce(undefined);

    await gitStageFile("C:\\repo", "src/main.rs");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_stage_file", {
      repo_path: "C:\\repo",
      file_path: "src/main.rs",
    });
  });

  it("invokes git_unstage_file with repo_path and file_path", async () => {
    const { gitUnstageFile } = await import("../../src/modules/ipc/ipc.git");
    invokeMock.mockResolvedValueOnce(undefined);

    await gitUnstageFile("C:\\repo", "src/main.rs");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_unstage_file", {
      repo_path: "C:\\repo",
      file_path: "src/main.rs",
    });
  });

  it("invokes git_stage_all with repo_path", async () => {
    const { gitStageAll } = await import("../../src/modules/ipc/ipc.git");
    invokeMock.mockResolvedValueOnce(undefined);

    await gitStageAll("C:\\repo");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_stage_all", {
      repo_path: "C:\\repo",
    });
  });

  it("invokes git_unstage_all with repo_path", async () => {
    const { gitUnstageAll } = await import("../../src/modules/ipc/ipc.git");
    invokeMock.mockResolvedValueOnce(undefined);

    await gitUnstageAll("C:\\repo");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_unstage_all", {
      repo_path: "C:\\repo",
    });
  });

  it("invokes git_discard_changes with repo_path and file_path", async () => {
    const { gitDiscardChanges } = await import("../../src/modules/ipc/ipc.git");
    invokeMock.mockResolvedValueOnce(undefined);

    await gitDiscardChanges("C:\\repo", "src/main.rs");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_discard_changes", {
      repo_path: "C:\\repo",
      file_path: "src/main.rs",
    });
  });

  it("invokes git_commit with repo_path, message, and amend", async () => {
    const { gitCommit } = await import("../../src/modules/ipc/ipc.git");
    const mockResult = { id: "1234567890", short_id: "1234567", summary: "feat: add git" };
    invokeMock.mockResolvedValueOnce(mockResult);

    const res = await gitCommit("C:\\repo", "feat: add git", false);
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_commit", {
      repo_path: "C:\\repo",
      message: "feat: add git",
      amend: false,
    });
    expect(res).toEqual(mockResult);
  });

  it("invokes git_list_branches with repo_path", async () => {
    const { gitListBranches } = await import("../../src/modules/ipc/ipc.git");
    const mockBranches = [{ name: "main", is_current: true, is_remote: false }];
    invokeMock.mockResolvedValueOnce(mockBranches);

    const res = await gitListBranches("C:\\repo");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_list_branches", {
      repo_path: "C:\\repo",
    });
    expect(res).toEqual(mockBranches);
  });

  it("invokes git_checkout_branch with repo_path and name", async () => {
    const { gitCheckoutBranch } = await import("../../src/modules/ipc/ipc.git");
    invokeMock.mockResolvedValueOnce(undefined);

    await gitCheckoutBranch("C:\\repo", "feature-x");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_checkout_branch", {
      repo_path: "C:\\repo",
      name: "feature-x",
    });
  });

  it("invokes git_create_branch with repo_path and name", async () => {
    const { gitCreateBranch } = await import("../../src/modules/ipc/ipc.git");
    invokeMock.mockResolvedValueOnce(undefined);

    await gitCreateBranch("C:\\repo", "feature-x");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_create_branch", {
      repo_path: "C:\\repo",
      name: "feature-x",
    });
  });

  it("invokes git_get_diff with repo_path and file_path", async () => {
    const { gitGetDiff } = await import("../../src/modules/ipc/ipc.git");
    const mockDiff = {
      path: "src/main.rs",
      head_content: "fn old() {}",
      working_content: "fn new() {}",
    };
    invokeMock.mockResolvedValueOnce(mockDiff);

    const res = await gitGetDiff("C:\\repo", "src/main.rs");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_get_diff", {
      repo_path: "C:\\repo",
      file_path: "src/main.rs",
    });
    expect(res).toEqual(mockDiff);
  });

  it("invokes git_get_log with repo_path, limit, and skip", async () => {
    const { gitGetLog } = await import("../../src/modules/ipc/ipc.git");
    const mockNodes = [
      {
        id: "123",
        short_id: "123",
        summary: "init",
        author_name: "User",
        author_email: "u@u.com",
        timestamp: 123456,
        parents: [],
        refs: ["HEAD -> main"],
      },
    ];
    invokeMock.mockResolvedValueOnce(mockNodes);

    const res = await gitGetLog("C:\\repo", 20, 0);
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_get_log", {
      repo_path: "C:\\repo",
      limit: 20,
      skip: 0,
    });
    expect(res).toEqual(mockNodes);
  });

  it("invokes git_pick_folder with no args", async () => {
    const { gitPickFolder } = await import("../../src/modules/ipc/ipc.git");
    invokeMock.mockResolvedValueOnce("C:\\selected");

    const res = await gitPickFolder();
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_pick_folder");
    expect(res).toBe("C:\\selected");
  });

  it("invokes git_stash_save with repo_path and optional message", async () => {
    const { gitStashSave } = await import("../../src/modules/ipc/ipc.git");
    invokeMock.mockResolvedValueOnce(undefined);

    await gitStashSave("C:\\repo", "WIP");
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_stash_save", {
      repo_path: "C:\\repo",
      message: "WIP",
    });
  });

  it("invokes git_stash_pop with repo_path and optional index", async () => {
    const { gitStashPop } = await import("../../src/modules/ipc/ipc.git");
    invokeMock.mockResolvedValueOnce(undefined);

    await gitStashPop("C:\\repo", 0);
    expect(invokeMock).toHaveBeenCalledWith("plugin:gencore-git|git_stash_pop", {
      repo_path: "C:\\repo",
      index: 0,
    });
  });
});
