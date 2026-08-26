//! Browser plugin for GenCore.
//!
//! Owns per-tab multiwebview creation/teardown (with the `on_navigation` /
//! `on_page_load` / `on_download` hooks Rust must attach at creation time),
//! download-to-disk handling, and JSON-file-backed bookmarks/history/downloads
//! storage, mirroring `gencore-core`'s `pinned_store` pattern.

mod modules;

pub use modules::browser_store::{
    BOOKMARKS_FILE_NAME, BROWSER_STORE_JSON_MAX_BYTES, BrowserStoreError, DEFAULT_BOOKMARKS_JSON,
    DEFAULT_DOWNLOADS_JSON, DEFAULT_HISTORY_JSON, DOWNLOADS_FILE_NAME, HISTORY_FILE_NAME,
    load_bookmarks, load_downloads, load_history, read_store_file, save_bookmarks, save_downloads,
    save_history, store_path, write_store_file,
};
pub use modules::downloads::{
    DOWNLOAD_FINISHED_EVENT, DOWNLOAD_STARTED_EVENT, DownloadFinishedPayload,
    DownloadStartedPayload, DownloadsError, handle_download_event, unique_destination,
};
pub use modules::tab_webview::{
    CloseTabWebviewArgs, CreateTabWebviewArgs, TAB_LOAD_FINISHED_EVENT, TAB_LOAD_STARTED_EVENT,
    TAB_NAVIGATED_EVENT, TabLoadPayload, TabNavigatedPayload, TabWebviewError, close_tab_webview,
    create_tab_webview, eval_tab_webview, navigate_tab_webview,
};

use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};

/// Identifier this plugin is registered under with [`tauri::Builder::plugin`].
pub const PLUGIN_ID: &str = "gencore-browser";

/// Initializes the `gencore-browser` plugin.
///
/// No permissions are allowed by default; see `permissions/default.toml`.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_ID)
        .invoke_handler(tauri::generate_handler![
            create_tab_webview,
            close_tab_webview,
            navigate_tab_webview,
            eval_tab_webview,
            load_bookmarks,
            save_bookmarks,
            load_history,
            save_history,
            load_downloads,
            save_downloads
        ])
        .build()
}
