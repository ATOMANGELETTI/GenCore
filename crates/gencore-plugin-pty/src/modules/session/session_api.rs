use serde::Deserialize;

use super::session_error::SessionError;

/// Arguments for opening a new pty session.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OpenArgs {
    /// Initial terminal width, in columns.
    pub cols: u16,
    /// Initial terminal height, in rows.
    pub rows: u16,
}

/// Arguments for closing an existing pty session.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CloseArgs {
    /// Identifier of the session to close.
    pub session_id: String,
}

/// Opens a new pty session.
///
/// Stub implementation: real process spawning is not implemented yet.
#[tauri::command]
pub async fn open(_args: OpenArgs) -> Result<(), SessionError> {
    Err(SessionError::NotImplemented)
}

/// Closes an existing pty session.
///
/// Stub implementation: real process teardown is not implemented yet.
#[tauri::command]
pub async fn close(_args: CloseArgs) -> Result<(), SessionError> {
    Err(SessionError::NotImplemented)
}
