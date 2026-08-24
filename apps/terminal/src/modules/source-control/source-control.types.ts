import type { GitBranchInfo, GitCommitNode, GitFileStatus } from "../ipc/ipc.types";

export interface SourceControlState {
  readonly folderPath: string | null;
  readonly isGitRepo: boolean;
  readonly branch: string | null;
  readonly branches: readonly GitBranchInfo[];
  readonly stagedFiles: readonly GitFileStatus[];
  readonly unstagedFiles: readonly GitFileStatus[];
  readonly untrackedFiles: readonly string[];
  readonly ahead: number;
  readonly behind: number;
  readonly commits: readonly GitCommitNode[];
  readonly loading: boolean;
  readonly refreshing: boolean;
  readonly error: string | null;
}
