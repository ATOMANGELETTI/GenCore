import { invoke } from "@tauri-apps/api/core";

/**
 * JSON blob load/save wrappers over the `gencore-browser` plugin's file-backed
 * stores (mirrors `gencore-core`'s pinned-tabs pattern). The frontend owns the
 * schema and versioning; Rust just persists an opaque string per file.
 */

export function loadBookmarks(): Promise<string> {
  return invoke<string>("plugin:gencore-browser|load_bookmarks");
}

export function saveBookmarks(json: string): Promise<void> {
  return invoke<void>("plugin:gencore-browser|save_bookmarks", { json });
}

export function loadHistory(): Promise<string> {
  return invoke<string>("plugin:gencore-browser|load_history");
}

export function saveHistory(json: string): Promise<void> {
  return invoke<void>("plugin:gencore-browser|save_history", { json });
}

export function loadDownloads(): Promise<string> {
  return invoke<string>("plugin:gencore-browser|load_downloads");
}

export function saveDownloads(json: string): Promise<void> {
  return invoke<void>("plugin:gencore-browser|save_downloads", { json });
}
