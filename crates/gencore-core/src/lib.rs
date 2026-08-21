//! Shared core types, typed errors, and diagnostics for GenCore Tauri plugins.
//!
//! This crate is itself a small Tauri plugin (`gencore-core`) that exposes
//! `get_app_info` plus pinned-tab persistence. Other GenCore crates depend on
//! it for the [`CoreError`] type and the [`init_logging`] hook.

mod modules;

pub use modules::app_info::{AppInfo, AppInfoError, get_app_info};
pub use modules::error::{CoreError, CoreResult};
pub use modules::logging::{LoggingError, init_logging};
pub use modules::pinned_store::{
    DEFAULT_PINNED_TABS_JSON, PINNED_TABS_FILE_NAME, PINNED_TABS_JSON_MAX_BYTES, PinnedStoreError,
    SavePinnedTabsArgs, load_pinned_tabs, pinned_tabs_path, read_pinned_tabs_file,
    save_pinned_tabs, write_pinned_tabs_file,
};

use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};

/// Identifier this plugin is registered under with [`tauri::Builder::plugin`].
pub const PLUGIN_ID: &str = "gencore-core";

/// Initializes the `gencore-core` plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_ID)
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            load_pinned_tabs,
            save_pinned_tabs
        ])
        .build()
}
