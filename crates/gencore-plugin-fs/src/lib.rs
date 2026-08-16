//! Stub filesystem plugin for GenCore.
//!
//! This crate defines the `gencore-fs` command surface (`list`, `stat`,
//! `watch`) with validated arguments and typed errors. No real filesystem
//! access is implemented yet: every command returns a `NotImplemented`
//! error from its module.
//!
//! Note: this crate is deliberately not named `tauri-plugin-fs`, which is
//! the official Tauri filesystem plugin.

mod modules;

pub use modules::list::{ListArgs, ListError, list};
pub use modules::stat::{StatArgs, StatError, stat};
pub use modules::watch::{WatchArgs, WatchError, watch};

use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};

/// Identifier this plugin is registered under with [`tauri::Builder::plugin`].
pub const PLUGIN_ID: &str = "gencore-fs";

/// Initializes the `gencore-fs` plugin.
///
/// No permissions are allowed by default; see `permissions/default.toml`.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_ID)
        .invoke_handler(tauri::generate_handler![list, stat, watch])
        .build()
}
