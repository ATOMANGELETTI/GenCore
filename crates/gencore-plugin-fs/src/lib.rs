//! Filesystem plugin for GenCore.
//!
//! `list` and `list_drives` perform real Windows filesystem access. `stat` and
//! `watch` remain stubs until later tasks.
//!
//! Note: this crate is deliberately not named `tauri-plugin-fs`, which is
//! the official Tauri filesystem plugin.

mod modules;

pub use modules::list::{FsEntry, FsKind, ListArgs, ListError, ListResult, list};
pub use modules::list_drives::{DriveEntry, DriveKind, ListDrivesError, list_drives};
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
        .invoke_handler(tauri::generate_handler![list, list_drives, stat, watch])
        .build()
}
