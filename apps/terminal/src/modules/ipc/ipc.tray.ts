import { invoke } from "@tauri-apps/api/core";

export type TrayAction = "show" | "hide" | "quit";

/** Command id that Task 5 registers on the `gencore-core` plugin. */
const TRAY_ACTION_COMMAND = "plugin:gencore-core|tray_action";

/**
 * Show, hide, or quit from the tray-menu overlay.
 *
 * Every command goes through `src/modules/ipc/` wrappers. The UI never calls
 * `invoke` directly so the command surface stays auditable in one place.
 */
export function trayAction(action: TrayAction): Promise<void> {
  return invoke<void>(TRAY_ACTION_COMMAND, { action });
}
