use serde::Deserialize;

use super::io_error::IoError;

/// Arguments for writing data to a pty session.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WriteArgs {
    /// Identifier of the session to write to.
    pub session_id: String,
    /// UTF-8 data to write to the pty.
    pub data: String,
}

/// Writes data to an existing pty session.
///
/// Stub implementation: real terminal I/O is not implemented yet.
#[tauri::command]
pub async fn write(_args: WriteArgs) -> Result<(), IoError> {
    Err(IoError::NotImplemented)
}
