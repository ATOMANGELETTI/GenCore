import { invoke } from "@tauri-apps/api/core";
import { LogicalPosition, LogicalSize } from "@tauri-apps/api/dpi";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Webview } from "@tauri-apps/api/webview";
import type {
  DownloadFinishedPayload,
  DownloadStartedPayload,
  TabLoadPayload,
  TabNavigatedPayload,
} from "./ipc.types";

const CREATE_TAB_WEBVIEW_COMMAND = "plugin:gencore-browser|create_tab_webview";
const CLOSE_TAB_WEBVIEW_COMMAND = "plugin:gencore-browser|close_tab_webview";
const NAVIGATE_TAB_WEBVIEW_COMMAND = "plugin:gencore-browser|navigate_tab_webview";
const EVAL_TAB_WEBVIEW_COMMAND = "plugin:gencore-browser|eval_tab_webview";

export const TAB_NAVIGATED_EVENT = "gencore-browser://tab-navigated";
export const TAB_LOAD_STARTED_EVENT = "gencore-browser://tab-load-started";
export const TAB_LOAD_FINISHED_EVENT = "gencore-browser://tab-load-finished";
export const DOWNLOAD_STARTED_EVENT = "gencore-browser://download-started";
export const DOWNLOAD_FINISHED_EVENT = "gencore-browser://download-finished";

export interface WebviewRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Typed wrappers for browser tab content webviews. Creation goes through the
 * `gencore-browser` plugin (the only way to attach the Rust-side
 * `on_navigation`/`on_page_load`/`on_download` hooks); once a tab webview
 * exists, everyday control (size/position/zoom/focus/show/hide) uses Tauri's
 * built-in `@tauri-apps/api/webview` `Webview` class directly.
 *
 * UI components never call `invoke`/`Webview` directly — everything routes
 * through this module.
 */
export function createTabWebview(label: string, url: string): Promise<void> {
  return invoke<void>(CREATE_TAB_WEBVIEW_COMMAND, { label, url });
}

export function closeTabWebview(label: string): Promise<void> {
  return invoke<void>(CLOSE_TAB_WEBVIEW_COMMAND, { label });
}

export function navigateTabWebview(label: string, url: string): Promise<void> {
  return invoke<void>(NAVIGATE_TAB_WEBVIEW_COMMAND, { label, url });
}

/** Evaluates a script inside a tab webview (used for find-in-page). */
export function evalTabWebview(label: string, script: string): Promise<void> {
  return invoke<void>(EVAL_TAB_WEBVIEW_COMMAND, { label, script });
}

export async function setTabWebviewBounds(label: string, rect: WebviewRect): Promise<void> {
  const webview = await Webview.getByLabel(label);
  if (!webview) {
    return;
  }
  await webview.setPosition(new LogicalPosition(rect.x, rect.y));
  await webview.setSize(new LogicalSize(rect.width, rect.height));
}

export async function setTabWebviewZoom(label: string, scaleFactor: number): Promise<void> {
  const webview = await Webview.getByLabel(label);
  await webview?.setZoom(scaleFactor);
}

export async function showTabWebview(label: string): Promise<void> {
  const webview = await Webview.getByLabel(label);
  await webview?.show();
}

export async function hideTabWebview(label: string): Promise<void> {
  const webview = await Webview.getByLabel(label);
  await webview?.hide();
}

export async function focusTabWebview(label: string): Promise<void> {
  const webview = await Webview.getByLabel(label);
  await webview?.setFocus();
}

export function subscribeTabNavigated(
  handler: (payload: TabNavigatedPayload) => void,
): Promise<UnlistenFn> {
  return listen<TabNavigatedPayload>(TAB_NAVIGATED_EVENT, (event) => handler(event.payload));
}

export function subscribeTabLoadStarted(
  handler: (payload: TabLoadPayload) => void,
): Promise<UnlistenFn> {
  return listen<TabLoadPayload>(TAB_LOAD_STARTED_EVENT, (event) => handler(event.payload));
}

export function subscribeTabLoadFinished(
  handler: (payload: TabLoadPayload) => void,
): Promise<UnlistenFn> {
  return listen<TabLoadPayload>(TAB_LOAD_FINISHED_EVENT, (event) => handler(event.payload));
}

export function subscribeDownloadStarted(
  handler: (payload: DownloadStartedPayload) => void,
): Promise<UnlistenFn> {
  return listen<DownloadStartedPayload>(DOWNLOAD_STARTED_EVENT, (event) => handler(event.payload));
}

export function subscribeDownloadFinished(
  handler: (payload: DownloadFinishedPayload) => void,
): Promise<UnlistenFn> {
  return listen<DownloadFinishedPayload>(DOWNLOAD_FINISHED_EVENT, (event) =>
    handler(event.payload),
  );
}
