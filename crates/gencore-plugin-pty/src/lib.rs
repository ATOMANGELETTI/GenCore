//! Stub pseudo-terminal plugin for GenCore.
//!
//! This crate defines the `gencore-pty` command surface (`open`, `write`,
//! `resize`, `close`) with validated arguments and typed errors. No process
//! spawning or real terminal I/O is implemented yet: every command returns a
//! `NotImplemented` error from its module.

mod modules;

pub use modules::io::{IoError, WriteArgs, write};
pub use modules::resize::{ResizeArgs, ResizeError, resize};
pub use modules::session::{CloseArgs, OpenArgs, SessionError, close, open};

use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};

/// Identifier this plugin is registered under with [`tauri::Builder::plugin`].
pub const PLUGIN_ID: &str = "gencore-pty";

/// Initializes the `gencore-pty` plugin.
///
/// No permissions are allowed by default; see `permissions/default.toml`.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_ID)
        .invoke_handler(tauri::generate_handler![open, write, resize, close])
        .build()
}
