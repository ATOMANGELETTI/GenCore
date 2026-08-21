import { invoke } from "@tauri-apps/api/core";

const LOAD_PINNED_COMMAND = "plugin:gencore-core|load_pinned_tabs";
const SAVE_PINNED_COMMAND = "plugin:gencore-core|save_pinned_tabs";

/**
 * Pinned-tab JSON store IPC. Every command goes through this module so the
 * Isolation allowlist and capabilities stay auditable in one place.
 */
export function loadPinnedTabs(): Promise<string> {
  return invoke<string>(LOAD_PINNED_COMMAND);
}

export function savePinnedTabs(json: string): Promise<void> {
  return invoke<void>(SAVE_PINNED_COMMAND, { json });
}
