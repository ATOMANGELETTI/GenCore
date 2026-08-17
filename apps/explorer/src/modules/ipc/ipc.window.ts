import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Typed wrappers around the current window's core commands, used by the
 * titlebar traffic lights. Always goes through a cached `getCurrentWindow()`
 * from `@tauri-apps/api/window`; never touches the deprecated
 * `window.__TAURI__` global.
 *
 * Titlebar drag also uses `data-tauri-drag-region` (WebView native path);
 * `startDraggingWindow()` exists for completeness and for any JS callers.
 */

let currentWindow: ReturnType<typeof getCurrentWindow> | undefined;

function appWindow(): ReturnType<typeof getCurrentWindow> {
  currentWindow ??= getCurrentWindow();
  return currentWindow;
}

export function closeWindow(): Promise<void> {
  return appWindow().close();
}

export function minimizeWindow(): Promise<void> {
  return appWindow().minimize();
}

export function toggleMaximizeWindow(): Promise<void> {
  return appWindow().toggleMaximize();
}

export function startDraggingWindow(): Promise<void> {
  return appWindow().startDragging();
}
