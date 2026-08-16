import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Thin wrappers around the current window's core commands, used by the
 * titlebar traffic lights. Always goes through `getCurrentWindow()` from
 * `@tauri-apps/api/window` — never `window.__TAURI__`.
 */

export function closeWindow(): Promise<void> {
  return getCurrentWindow().close();
}

export function minimizeWindow(): Promise<void> {
  return getCurrentWindow().minimize();
}

export function toggleMaximizeWindow(): Promise<void> {
  return getCurrentWindow().toggleMaximize();
}
