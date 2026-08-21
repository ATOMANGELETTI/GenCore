use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Runtime, State};

use super::session_error::SessionError;
use super::session_map::{PTY_DATA_EVENT, PTY_EXIT_EVENT, SessionMap, kill_session, spawn_session};

/// Arguments for opening a new pty session.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OpenArgs {
    /// Initial terminal width, in columns.
    pub cols: u16,
    /// Initial terminal height, in rows.
    pub rows: u16,
    /// Working directory for the shell. Defaults to `%USERPROFILE%` when omitted.
    #[serde(default)]
    pub cwd: Option<String>,
    /// UI theme name: `polar-night`, `snow-storm`, or omitted.
    #[serde(default)]
    pub theme: Option<String>,
}

/// Result of a successful [`open`] call.
#[derive(Debug, Serialize)]
pub struct OpenResult {
    /// UUID assigned to the new session.
    pub session_id: String,
}

/// Arguments for closing an existing pty session.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CloseArgs {
    /// Identifier of the session to close.
    pub session_id: String,
}

/// Opens a new pty session and starts emitting data/exit events.
#[tauri::command]
pub async fn open<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, Arc<Mutex<SessionMap>>>,
    args: OpenArgs,
) -> Result<OpenResult, SessionError> {
    let map = Arc::clone(state.inner());
    let app_data = app.clone();
    let app_exit = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        spawn_session(
            &map,
            args,
            move |payload| {
                let _ = app_data.emit(PTY_DATA_EVENT, payload);
            },
            move |payload| {
                let _ = app_exit.emit(PTY_EXIT_EVENT, payload);
            },
        )
        .map(|session_id| OpenResult { session_id })
    })
    .await
    .map_err(|err| SessionError::SpawnFailed(err.to_string()))?
}

/// Closes an existing pty session.
#[tauri::command]
pub async fn close(
    state: State<'_, Arc<Mutex<SessionMap>>>,
    args: CloseArgs,
) -> Result<(), SessionError> {
    let map = Arc::clone(state.inner());
    tauri::async_runtime::spawn_blocking(move || kill_session(&map, &args.session_id))
        .await
        .map_err(|err| SessionError::Io(err.to_string()))?
}
