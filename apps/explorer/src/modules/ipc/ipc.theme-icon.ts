import type { ThemeIconVariant } from "@gencore/ui-kit";
import { invoke } from "@tauri-apps/api/core";

const SET_THEME_ICON_COMMAND = "plugin:gencore-core|set_theme_icon";

/**
 * Invokes the `gencore-core|set_theme_icon` Tauri command to synchronize
 * the native taskbar and tray icon with the active theme.
 *
 * The backend maps the active theme to its contrasting icon asset so that
 * the icon remains legible against the operating system's taskbar/tray colors.
 */
export function setThemeIcon(theme: ThemeIconVariant): Promise<void> {
  return invoke<void>(SET_THEME_ICON_COMMAND, { theme });
}
