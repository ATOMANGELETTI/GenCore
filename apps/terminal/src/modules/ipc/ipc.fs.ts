import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { DriveEntry, ListResult } from "./ipc.types";

const LIST_DRIVES_COMMAND = "plugin:gencore-fs|list_drives";
const LIST_COMMAND = "plugin:gencore-fs|list";
const CREATE_FILE_COMMAND = "plugin:gencore-fs|create_file";
const CREATE_DIR_COMMAND = "plugin:gencore-fs|create_dir";
const WATCH_COMMAND = "plugin:gencore-fs|watch";
const UNWATCH_COMMAND = "plugin:gencore-fs|unwatch";
const ENTRY_CHANGED_EVENT = "gencore-fs://entry-changed";

/**
 * Filesystem IPC for the Terminal file tree. Every command goes through this
 * module so the Isolation allowlist and capabilities stay auditable in one place.
 */
export function listDrives(): Promise<DriveEntry[]> {
  return invoke<DriveEntry[]>(LIST_DRIVES_COMMAND);
}

export function listDir(path: string): Promise<ListResult> {
  return invoke<ListResult>(LIST_COMMAND, { path });
}

export function createFile(path: string): Promise<void> {
  return invoke<void>(CREATE_FILE_COMMAND, { path });
}

export function createDir(path: string): Promise<void> {
  return invoke<void>(CREATE_DIR_COMMAND, { path });
}

export function watchDir(path: string): Promise<void> {
  return invoke<void>(WATCH_COMMAND, { path, recursive: false });
}

export function unwatchDir(path: string): Promise<void> {
  return invoke<void>(UNWATCH_COMMAND, { path });
}

export function subscribeFsChanges(
  handler: (payload: { parent: string; kind: string }) => void,
): Promise<() => void> {
  return listen<{ parent: string; kind: string }>(ENTRY_CHANGED_EVENT, (event) => {
    handler(event.payload);
  });
}
