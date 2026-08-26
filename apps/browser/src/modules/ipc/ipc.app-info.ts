import { invoke } from "@tauri-apps/api/core";
import type { AppInfo } from "./ipc.types";

/**
 * Typed wrapper around the `gencore-core` plugin's `get_app_info` command.
 * The UI must never call `invoke` directly; every command gets its own
 * typed wrapper in `src/modules/ipc/`.
 */
export function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>("plugin:gencore-core|get_app_info");
}
