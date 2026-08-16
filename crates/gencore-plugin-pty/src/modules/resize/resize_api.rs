use serde::Deserialize;

use super::resize_error::ResizeError;

/// Arguments for resizing an existing pty session.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ResizeArgs {
    /// Identifier of the session to resize.
    pub session_id: String,
    /// New terminal width, in columns.
    pub cols: u16,
    /// New terminal height, in rows.
    pub rows: u16,
}

/// Resizes an existing pty session.
///
/// Stub implementation: real terminal resizing is not implemented yet.
#[tauri::command]
pub async fn resize(_args: ResizeArgs) -> Result<(), ResizeError> {
    Err(ResizeError::NotImplemented)
}
