import { invoke } from "@tauri-apps/api/core";
import type { AppInfo } from "./ipc.types";

/** Command id registered by the `gencore-core` plugin (see `crates/gencore-core/src/lib.rs`). */
const GET_APP_INFO_COMMAND = "plugin:gencore-core|get_app_info";

/**
 * Reads application metadata from Tauri core.
 *
 * Every command goes through `src/modules/ipc/` wrappers (opener, window,
 * app-info). The UI never calls `invoke` directly so the command surface
 * stays auditable in one place.
 */
export function getAppInfo(): Promise<AppInfo> {
  return invoke<AppInfo>(GET_APP_INFO_COMMAND);
}
