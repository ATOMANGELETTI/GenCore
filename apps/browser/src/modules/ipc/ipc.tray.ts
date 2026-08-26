import { invoke } from "@tauri-apps/api/core";

export type TrayAction = "show" | "hide" | "quit";

/**
 * Typed wrapper around the `gencore-core` plugin's `tray_action` command.
 * The UI must never call `invoke` directly; every command gets its own
 * typed wrapper in `src/modules/ipc/`.
 */
export function trayAction(action: TrayAction): Promise<void> {
  return invoke<void>("plugin:gencore-core|tray_action", { action });
}
