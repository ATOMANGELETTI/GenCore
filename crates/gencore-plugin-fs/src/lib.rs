//! Filesystem plugin for GenCore.
//!
//! `list`, `list_drives`, `create_file`, `create_dir`, `stat`, `rename`,
//! `delete`, `copy`, `move_paths`, `watch`, and `unwatch` perform real
//! Windows filesystem access.
//!
//! Note: this crate is deliberately not named `tauri-plugin-fs`, which is
//! the official Tauri filesystem plugin.

mod modules;

pub use modules::copy::{CopyArgs, CopyError, copy};
pub use modules::create_dir::{CreateDirArgs, CreateDirError, create_dir};
pub use modules::create_file::{CreateFileArgs, CreateFileError, create_file};
pub use modules::delete::{DeleteArgs, DeleteError, delete};
pub use modules::list::{FsEntry, FsKind, ListArgs, ListError, ListResult, list};
pub use modules::list_drives::{
    DriveEntry, DriveKind, ListDrivesError, is_usable_mount, list_drives,
};
pub use modules::move_paths::{MoveArgs, MoveError, move_paths};
pub use modules::rename::{RenameArgs, RenameError, RenameResult, rename};
pub use modules::stat::{StatArgs, StatError, StatResult, stat};
pub use modules::unwatch::{UnwatchArgs, UnwatchError, stop_watch, unwatch};
pub use modules::watch::{
    AccessKind, CreateKind, DataChange, EntryChangeKind, EntryChangedPayload, EventKind,
    ModifyKind, RemoveKind, RenameMode, WatchArgs, WatchError, WatchMap, apply_debounced_events,
    handle_debounce_error, map_event_kind, start_watch, watch,
};

use std::sync::{Arc, Mutex};

use tauri::{
    Manager, Runtime,
    plugin::{Builder, TauriPlugin},
};

/// Identifier this plugin is registered under with [`tauri::Builder::plugin`].
pub const PLUGIN_ID: &str = "gencore-fs";

/// Initializes the `gencore-fs` plugin.
///
/// No permissions are allowed by default; see `permissions/default.toml`.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_ID)
        .invoke_handler(tauri::generate_handler![
            list,
            list_drives,
            create_file,
            create_dir,
            stat,
            rename,
            delete,
            copy,
            move_paths,
            watch,
            unwatch
        ])
        .setup(|app, _api| {
            app.manage(Arc::new(Mutex::new(WatchMap::new())));
            Ok(())
        })
        .build()
}
