import * as React from "react";
import { readWorkspaceFolder, writeWorkspaceFolder } from "../files/files.storage";
import {
  gitCheckoutBranch,
  gitCommit,
  gitCreateBranch,
  gitDiscardChanges,
  gitGetLog,
  gitGetStatus,
  gitInitRepo,
  gitListBranches,
  gitPickFolder,
  gitStageAll,
  gitStageFile,
  gitStashPop,
  gitStashSave,
  gitUnstageAll,
  gitUnstageFile,
} from "../ipc/ipc.git";
import type {
  GitBranchInfo,
  GitCommitNode,
  GitFileStatus,
  GitStatusResult,
} from "../ipc/ipc.types";

export interface SourceControlContextValue {
  folderPath: string | null;
  isGitRepo: boolean;
  branch: string | null;
  branches: readonly GitBranchInfo[];
  stagedFiles: readonly GitFileStatus[];
  unstagedFiles: readonly GitFileStatus[];
  untrackedFiles: readonly string[];
  ahead: number;
  behind: number;
  commits: readonly GitCommitNode[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  openFolderPicker: () => Promise<void>;
  setWorkspaceFolder: (path: string | null) => Promise<void>;
  initRepo: () => Promise<void>;
  refresh: () => Promise<void>;
  stageFile: (filePath: string) => Promise<void>;
  unstageFile: (filePath: string) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;
  discardChanges: (filePath?: string) => Promise<void>;
  commit: (message: string, amend?: boolean) => Promise<void>;
  checkoutBranch: (branchName: string) => Promise<void>;
  createBranch: (branchName: string) => Promise<void>;
  stashSave: (message?: string) => Promise<void>;
  stashPop: (index?: number) => Promise<void>;
}

const SourceControlContext = React.createContext<SourceControlContextValue | null>(null);

export function SourceControlProvider({ children }: { children: React.ReactNode }) {
  const [folderPath, setFolderPathState] = React.useState<string | null>(() =>
    readWorkspaceFolder(),
  );
  const [isGitRepo, setIsGitRepo] = React.useState(false);
  const [branch, setBranch] = React.useState<string | null>(null);
  const [branches, setBranches] = React.useState<readonly GitBranchInfo[]>([]);
  const [stagedFiles, setStagedFiles] = React.useState<readonly GitFileStatus[]>([]);
  const [unstagedFiles, setUnstagedFiles] = React.useState<readonly GitFileStatus[]>([]);
  const [untrackedFiles, setUntrackedFiles] = React.useState<readonly string[]>([]);
  const [ahead, setAhead] = React.useState(0);
  const [behind, setBehind] = React.useState(0);
  const [commits, setCommits] = React.useState<readonly GitCommitNode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const folderPathRef = React.useRef(folderPath);
  folderPathRef.current = folderPath;

  const refreshStatus = React.useCallback(async (path: string | null) => {
    if (!path) {
      setIsGitRepo(false);
      setBranch(null);
      setBranches([]);
      setStagedFiles([]);
      setUnstagedFiles([]);
      setUntrackedFiles([]);
      setAhead(0);
      setBehind(0);
      setCommits([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setRefreshing(true);
      setError(null);
      const status: GitStatusResult = await gitGetStatus(path);
      setIsGitRepo(status.is_repo);
      setBranch(status.branch);
      setStagedFiles(status.staged);
      setUnstagedFiles(status.unstaged);
      setUntrackedFiles(status.untracked);
      setAhead(status.ahead);
      setBehind(status.behind);

      if (status.is_repo) {
        try {
          const branchList = await gitListBranches(path);
          setBranches(branchList);
        } catch {
          // ignore
        }
        try {
          const logList = await gitGetLog(path, 50, 0);
          setCommits(logList);
        } catch {
          // ignore
        }
      } else {
        setBranches([]);
        setCommits([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsGitRepo(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshStatus(folderPath);

    if (!folderPath) {
      return;
    }

    const interval = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        void refreshStatus(folderPath);
      }
    }, 2500);

    function onFocus() {
      void refreshStatus(folderPath);
    }

    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [folderPath, refreshStatus]);

  const setWorkspaceFolder = React.useCallback(
    async (newPath: string | null) => {
      writeWorkspaceFolder(newPath);
      setFolderPathState(newPath);
      await refreshStatus(newPath);
    },
    [refreshStatus],
  );

  const openFolderPicker = React.useCallback(async () => {
    try {
      const picked = await gitPickFolder();
      if (picked) {
        await setWorkspaceFolder(picked);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [setWorkspaceFolder]);

  const initRepo = React.useCallback(async () => {
    const current = folderPathRef.current;
    if (!current) return;
    try {
      setLoading(true);
      await gitInitRepo(current);
      await refreshStatus(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, [refreshStatus]);

  const refresh = React.useCallback(async () => {
    await refreshStatus(folderPathRef.current);
  }, [refreshStatus]);

  const stageFile = React.useCallback(
    async (filePath: string) => {
      const current = folderPathRef.current;
      if (!current) return;
      try {
        await gitStageFile(current, filePath);
        await refreshStatus(current);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [refreshStatus],
  );

  const unstageFile = React.useCallback(
    async (filePath: string) => {
      const current = folderPathRef.current;
      if (!current) return;
      try {
        await gitUnstageFile(current, filePath);
        await refreshStatus(current);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [refreshStatus],
  );

  const stageAll = React.useCallback(async () => {
    const current = folderPathRef.current;
    if (!current) return;
    try {
      await gitStageAll(current);
      await refreshStatus(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [refreshStatus]);

  const unstageAll = React.useCallback(async () => {
    const current = folderPathRef.current;
    if (!current) return;
    try {
      await gitUnstageAll(current);
      await refreshStatus(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [refreshStatus]);

  const discardChanges = React.useCallback(
    async (filePath?: string) => {
      const current = folderPathRef.current;
      if (!current) return;
      try {
        if (filePath) {
          await gitDiscardChanges(current, filePath);
        } else {
          for (const file of unstagedFiles) {
            await gitDiscardChanges(current, file.path);
          }
        }
        await refreshStatus(current);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [refreshStatus, unstagedFiles],
  );

  const commit = React.useCallback(
    async (message: string, amend = false) => {
      const current = folderPathRef.current;
      if (!current) return;
      try {
        setRefreshing(true);
        await gitCommit(current, message, amend);
        await refreshStatus(current);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setRefreshing(false);
      }
    },
    [refreshStatus],
  );

  const checkoutBranch = React.useCallback(
    async (branchName: string) => {
      const current = folderPathRef.current;
      if (!current) return;
      try {
        setRefreshing(true);
        await gitCheckoutBranch(current, branchName);
        await refreshStatus(current);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setRefreshing(false);
      }
    },
    [refreshStatus],
  );

  const createBranch = React.useCallback(
    async (branchName: string) => {
      const current = folderPathRef.current;
      if (!current) return;
      try {
        setRefreshing(true);
        await gitCreateBranch(current, branchName);
        await refreshStatus(current);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setRefreshing(false);
      }
    },
    [refreshStatus],
  );

  const stashSave = React.useCallback(
    async (message?: string) => {
      const current = folderPathRef.current;
      if (!current) return;
      try {
        await gitStashSave(current, message ?? "");
        await refreshStatus(current);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [refreshStatus],
  );

  const stashPop = React.useCallback(
    async (index?: number) => {
      const current = folderPathRef.current;
      if (!current) return;
      try {
        await gitStashPop(current, index);
        await refreshStatus(current);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [refreshStatus],
  );

  const value = React.useMemo<SourceControlContextValue>(
    () => ({
      folderPath,
      isGitRepo,
      branch,
      branches,
      stagedFiles,
      unstagedFiles,
      untrackedFiles,
      ahead,
      behind,
      commits,
      loading,
      refreshing,
      error,
      openFolderPicker,
      setWorkspaceFolder,
      initRepo,
      refresh,
      stageFile,
      unstageFile,
      stageAll,
      unstageAll,
      discardChanges,
      commit,
      checkoutBranch,
      createBranch,
      stashSave,
      stashPop,
    }),
    [
      folderPath,
      isGitRepo,
      branch,
      branches,
      stagedFiles,
      unstagedFiles,
      untrackedFiles,
      ahead,
      behind,
      commits,
      loading,
      refreshing,
      error,
      openFolderPicker,
      setWorkspaceFolder,
      initRepo,
      refresh,
      stageFile,
      unstageFile,
      stageAll,
      unstageAll,
      discardChanges,
      commit,
      checkoutBranch,
      createBranch,
      stashSave,
      stashPop,
    ],
  );

  return React.createElement(SourceControlContext.Provider, { value }, children);
}

export function useSourceControlContext(): SourceControlContextValue {
  const context = React.useContext(SourceControlContext);
  if (!context) {
    throw new Error("useSourceControlContext must be used within a SourceControlProvider");
  }
  return context;
}
