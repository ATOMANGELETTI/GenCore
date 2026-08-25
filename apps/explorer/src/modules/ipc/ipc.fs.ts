import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  DriveEntry,
  EntryChangedPayload,
  ListResult,
  RenameResult,
  StatResult,
} from "./ipc.types";

const LIST_COMMAND = "plugin:gencore-fs|list";
const LIST_DRIVES_COMMAND = "plugin:gencore-fs|list_drives";
const STAT_COMMAND = "plugin:gencore-fs|stat";
const CREATE_FILE_COMMAND = "plugin:gencore-fs|create_file";
const CREATE_DIR_COMMAND = "plugin:gencore-fs|create_dir";
const RENAME_COMMAND = "plugin:gencore-fs|rename";
const DELETE_COMMAND = "plugin:gencore-fs|delete";
const COPY_COMMAND = "plugin:gencore-fs|copy";
const MOVE_PATHS_COMMAND = "plugin:gencore-fs|move_paths";
const WATCH_COMMAND = "plugin:gencore-fs|watch";
const UNWATCH_COMMAND = "plugin:gencore-fs|unwatch";
const ENTRY_CHANGED_EVENT = "gencore-fs://entry-changed";

/**
 * Filesystem IPC for the file explorer. Every command goes through this
 * module so the Isolation allowlist and capabilities stay auditable in one
 * place; UI code never calls `invoke` directly.
 */
export function listDir(path: string): Promise<ListResult> {
  return invoke<ListResult>(LIST_COMMAND, { path });
}

export function listDrives(): Promise<DriveEntry[]> {
  return invoke<DriveEntry[]>(LIST_DRIVES_COMMAND);
}

export function statPath(path: string): Promise<StatResult> {
  return invoke<StatResult>(STAT_COMMAND, { path });
}

export function createFile(path: string): Promise<void> {
  return invoke<void>(CREATE_FILE_COMMAND, { path });
}

export function createDir(path: string): Promise<void> {
  return invoke<void>(CREATE_DIR_COMMAND, { path });
}

export function renamePath(path: string, newName: string): Promise<RenameResult> {
  return invoke<RenameResult>(RENAME_COMMAND, { path, new_name: newName });
}

export function deletePaths(paths: readonly string[]): Promise<void> {
  return invoke<void>(DELETE_COMMAND, { paths });
}

export function copyPaths(paths: readonly string[], destinationDir: string): Promise<void> {
  return invoke<void>(COPY_COMMAND, { paths, destination_dir: destinationDir });
}

export function movePaths(paths: readonly string[], destinationDir: string): Promise<void> {
  return invoke<void>(MOVE_PATHS_COMMAND, { paths, destination_dir: destinationDir });
}

export function watchDir(path: string): Promise<void> {
  return invoke<void>(WATCH_COMMAND, { path, recursive: false });
}

export function unwatchDir(path: string): Promise<void> {
  return invoke<void>(UNWATCH_COMMAND, { path });
}

export function subscribeFsChanges(
  handler: (payload: EntryChangedPayload) => void,
): Promise<() => void> {
  return listen<EntryChangedPayload>(ENTRY_CHANGED_EVENT, (event) => {
    handler(event.payload);
  });
}
