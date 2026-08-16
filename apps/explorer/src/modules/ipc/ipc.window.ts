import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Typed wrappers around the current window's core commands, used by the
 * titlebar traffic lights. Always goes through `@tauri-apps/api/window`;
 * never touches the deprecated `window.__TAURI__` global.
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
