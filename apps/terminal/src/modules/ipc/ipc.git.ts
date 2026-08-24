import { invoke } from "@tauri-apps/api/core";
import type {
  GitBranchInfo,
  GitCommitNode,
  GitCommitResult,
  GitDiffResult,
  GitInitResult,
  GitStatusResult,
} from "./ipc.types";

const GET_STATUS_COMMAND = "plugin:gencore-git|git_get_status";
const INIT_REPO_COMMAND = "plugin:gencore-git|git_init_repo";
const STAGE_FILE_COMMAND = "plugin:gencore-git|git_stage_file";
const UNSTAGE_FILE_COMMAND = "plugin:gencore-git|git_unstage_file";
const STAGE_ALL_COMMAND = "plugin:gencore-git|git_stage_all";
const UNSTAGE_ALL_COMMAND = "plugin:gencore-git|git_unstage_all";
const DISCARD_CHANGES_COMMAND = "plugin:gencore-git|git_discard_changes";
const COMMIT_COMMAND = "plugin:gencore-git|git_commit";
const LIST_BRANCHES_COMMAND = "plugin:gencore-git|git_list_branches";
const CHECKOUT_BRANCH_COMMAND = "plugin:gencore-git|git_checkout_branch";
const CREATE_BRANCH_COMMAND = "plugin:gencore-git|git_create_branch";
const GET_DIFF_COMMAND = "plugin:gencore-git|git_get_diff";
const GET_LOG_COMMAND = "plugin:gencore-git|git_get_log";
const PICK_FOLDER_COMMAND = "plugin:gencore-git|git_pick_folder";
const STASH_SAVE_COMMAND = "plugin:gencore-git|git_stash_save";
const STASH_POP_COMMAND = "plugin:gencore-git|git_stash_pop";

/**
 * Git and Source Control IPC wrappers.
 * Enforces least-privilege Isolation validation and typed payload exchanges.
 */
export function gitGetStatus(path: string): Promise<GitStatusResult> {
  return invoke<GitStatusResult>(GET_STATUS_COMMAND, { path });
}

export function gitInitRepo(path: string): Promise<GitInitResult> {
  return invoke<GitInitResult>(INIT_REPO_COMMAND, { path });
}

export function gitStageFile(repoPath: string, filePath: string): Promise<void> {
  return invoke<void>(STAGE_FILE_COMMAND, { repo_path: repoPath, file_path: filePath });
}

export function gitUnstageFile(repoPath: string, filePath: string): Promise<void> {
  return invoke<void>(UNSTAGE_FILE_COMMAND, { repo_path: repoPath, file_path: filePath });
}

export function gitStageAll(repoPath: string): Promise<void> {
  return invoke<void>(STAGE_ALL_COMMAND, { repo_path: repoPath });
}

export function gitUnstageAll(repoPath: string): Promise<void> {
  return invoke<void>(UNSTAGE_ALL_COMMAND, { repo_path: repoPath });
}

export function gitDiscardChanges(repoPath: string, filePath: string): Promise<void> {
  return invoke<void>(DISCARD_CHANGES_COMMAND, { repo_path: repoPath, file_path: filePath });
}

export function gitCommit(
  repoPath: string,
  message: string,
  amend: boolean = false,
): Promise<GitCommitResult> {
  return invoke<GitCommitResult>(COMMIT_COMMAND, {
    repo_path: repoPath,
    message,
    amend,
  });
}

export function gitListBranches(repoPath: string): Promise<GitBranchInfo[]> {
  return invoke<GitBranchInfo[]>(LIST_BRANCHES_COMMAND, { repo_path: repoPath });
}

export function gitCheckoutBranch(repoPath: string, name: string): Promise<void> {
  return invoke<void>(CHECKOUT_BRANCH_COMMAND, { repo_path: repoPath, name });
}

export function gitCreateBranch(repoPath: string, name: string): Promise<void> {
  return invoke<void>(CREATE_BRANCH_COMMAND, { repo_path: repoPath, name });
}

export function gitGetDiff(repoPath: string, filePath: string): Promise<GitDiffResult> {
  return invoke<GitDiffResult>(GET_DIFF_COMMAND, { repo_path: repoPath, file_path: filePath });
}

export function gitGetLog(
  repoPath: string,
  limit?: number,
  skip?: number,
): Promise<GitCommitNode[]> {
  return invoke<GitCommitNode[]>(GET_LOG_COMMAND, {
    repo_path: repoPath,
    limit,
    skip,
  });
}

export function gitPickFolder(): Promise<string | null> {
  return invoke<string | null>(PICK_FOLDER_COMMAND);
}

export function gitStashSave(repoPath: string, message?: string): Promise<void> {
  return invoke<void>(STASH_SAVE_COMMAND, { repo_path: repoPath, message });
}

export function gitStashPop(repoPath: string, index?: number): Promise<void> {
  return invoke<void>(STASH_POP_COMMAND, { repo_path: repoPath, index });
}
