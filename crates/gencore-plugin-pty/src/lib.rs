//! Pseudo-terminal plugin for GenCore.
//!
//! Manages ConPTY sessions via `portable-pty`. Commands stay `open`, `write`,
//! `resize`, and `close`. Output is emitted as standard-base64
//! `gencore-pty://data` chunks; process end is `gencore-pty://exit`.

mod modules;

pub use modules::io::{IoError, WriteArgs, write, write_session};
pub use modules::resize::{ResizeArgs, ResizeError, resize, resize_session};
pub use modules::session::{
    CloseArgs, OhMyPoshSpawn, OpenArgs, OpenResult, PTY_DATA_EVENT, PTY_EXIT_EVENT, PtyDataPayload,
    PtyExitPayload, SessionError, SessionMap, close, is_real_executable, kill_session, open,
    resolve_oh_my_posh, resolve_shell, spawn_session,
};

use std::sync::{Arc, Mutex};

use tauri::{
    Manager, Runtime,
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
        .setup(|app, _api| {
            app.manage(Arc::new(Mutex::new(SessionMap::new())));
            Ok(())
        })
        .on_event(|app, event| {
            if matches!(event, tauri::RunEvent::Exit)
                && let Some(map) = app.try_state::<Arc<Mutex<SessionMap>>>()
                && let Ok(mut sessions) = map.lock()
            {
                sessions.clear();
            }
        })
        .build()
}
