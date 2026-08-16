//! Shared core types, typed errors, and diagnostics for GenCore Tauri plugins.
//!
//! This crate is itself a small Tauri plugin (`gencore-core`) that exposes a
//! single `get_app_info` command. Other GenCore crates depend on it for the
//! [`CoreError`] type and the [`init_logging`] hook.

mod modules;

pub use modules::app_info::{AppInfo, AppInfoError, get_app_info};
pub use modules::error::{CoreError, CoreResult};
pub use modules::logging::{LoggingError, init_logging};

use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};

/// Identifier this plugin is registered under with [`tauri::Builder::plugin`].
pub const PLUGIN_ID: &str = "gencore-core";

/// Initializes the `gencore-core` plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_ID)
        .invoke_handler(tauri::generate_handler![get_app_info])
        .build()
}
