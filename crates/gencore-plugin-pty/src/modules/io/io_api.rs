use std::io::Write;
use std::sync::{Arc, Mutex};

use serde::Deserialize;
use tauri::State;

use super::io_error::IoError;
use crate::modules::session::SessionMap;

/// Arguments for writing data to a pty session.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WriteArgs {
    /// Identifier of the session to write to.
    pub session_id: String,
    /// UTF-8 data to write to the pty.
    pub data: String,
}

/// Writes UTF-8 bytes to an existing pty session.
pub fn write_session(
    map: &Arc<Mutex<SessionMap>>,
    session_id: &str,
    data: &str,
) -> Result<(), IoError> {
    let map = map.lock().expect("session map mutex");
    let session = map.get(session_id).ok_or(IoError::SessionNotFound)?;
    let mut writer = session.writer.lock().expect("pty writer mutex");
    writer
        .write_all(data.as_bytes())
        .map_err(|err| IoError::Io(err.to_string()))?;
    writer.flush().map_err(|err| IoError::Io(err.to_string()))
}

/// Writes data to an existing pty session.
#[tauri::command]
pub async fn write(
    state: State<'_, Arc<Mutex<SessionMap>>>,
    args: WriteArgs,
) -> Result<(), IoError> {
    let map = Arc::clone(state.inner());
    tauri::async_runtime::spawn_blocking(move || write_session(&map, &args.session_id, &args.data))
        .await
        .map_err(|err| IoError::Io(err.to_string()))?
}
