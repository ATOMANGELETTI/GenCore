import * as React from "react";
import {
  copyPaths as copyPathsIpc,
  createDir as createDirIpc,
  createFile as createFileIpc,
  deletePaths as deletePathsIpc,
  movePaths as movePathsIpc,
  renamePath as renamePathIpc,
} from "../ipc/ipc.fs";
import { joinWindowsPath } from "../navigation/navigation.path";
import type { ClipboardMode, FileOpsApi, FileOpsClipboard } from "./file-ops.types";

function formatIpcError(error: unknown): string {
  if (typeof error === "string" && error.length > 0) {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return "Something went wrong";
}

/** Owns the explorer's in-app clipboard and wraps every write `gencore-fs` command. */
export function useFileOps(): FileOpsApi {
  const [clipboard, setClipboard] = React.useState<FileOpsClipboard | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const setClipboardWithMode = React.useCallback(
    (paths: readonly string[], mode: ClipboardMode) => {
      if (paths.length === 0) {
        return;
      }
      setClipboard({ paths, mode });
    },
    [],
  );

  const copyToClipboard = React.useCallback(
    (paths: readonly string[]) => {
      setClipboardWithMode(paths, "copy");
    },
    [setClipboardWithMode],
  );

  const cutToClipboard = React.useCallback(
    (paths: readonly string[]) => {
      setClipboardWithMode(paths, "cut");
    },
    [setClipboardWithMode],
  );

  const pasteInto = React.useCallback(
    async (destinationDir: string) => {
      if (!clipboard) {
        return;
      }
      setBusy(true);
      setError(null);
      try {
        if (clipboard.mode === "copy") {
          await copyPathsIpc(clipboard.paths, destinationDir);
        } else {
          await movePathsIpc(clipboard.paths, destinationDir);
          setClipboard(null);
        }
      } catch (cause) {
        setError(formatIpcError(cause));
      } finally {
        setBusy(false);
      }
    },
    [clipboard],
  );

  const createNewFile = React.useCallback(async (dir: string, name: string) => {
    setBusy(true);
    setError(null);
    try {
      await createFileIpc(joinWindowsPath(dir, name));
    } catch (cause) {
      setError(formatIpcError(cause));
    } finally {
      setBusy(false);
    }
  }, []);

  const createNewDir = React.useCallback(async (dir: string, name: string) => {
    setBusy(true);
    setError(null);
    try {
      await createDirIpc(joinWindowsPath(dir, name));
    } catch (cause) {
      setError(formatIpcError(cause));
    } finally {
      setBusy(false);
    }
  }, []);

  const renameEntry = React.useCallback(async (path: string, newName: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await renamePathIpc(path, newName);
      return result.path;
    } catch (cause) {
      setError(formatIpcError(cause));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const deleteEntries = React.useCallback(async (paths: readonly string[]) => {
    if (paths.length === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deletePathsIpc(paths);
    } catch (cause) {
      setError(formatIpcError(cause));
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    clipboard,
    busy,
    error,
    clearError,
    copyToClipboard,
    cutToClipboard,
    pasteInto,
    createNewFile,
    createNewDir,
    renameEntry,
    deleteEntries,
  };
}
