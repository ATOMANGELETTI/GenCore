use std::sync::{Arc, Mutex};

use portable_pty::PtySize;
use serde::Deserialize;
use tauri::State;

use super::resize_error::ResizeError;
use crate::modules::session::SessionMap;

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
pub fn resize_session(
    map: &Arc<Mutex<SessionMap>>,
    session_id: &str,
    cols: u16,
    rows: u16,
) -> Result<(), ResizeError> {
    let map = map.lock().expect("session map mutex");
    let session = map.get(session_id).ok_or(ResizeError::SessionNotFound)?;
    session
        .master
        .resize(PtySize {
            cols,
            rows,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|err| ResizeError::Io(err.to_string()))
}

/// Resizes an existing pty session.
#[tauri::command]
pub async fn resize(
    state: State<'_, Arc<Mutex<SessionMap>>>,
    args: ResizeArgs,
) -> Result<(), ResizeError> {
    let map = Arc::clone(state.inner());
    tauri::async_runtime::spawn_blocking(move || {
        resize_session(&map, &args.session_id, args.cols, args.rows)
    })
    .await
    .map_err(|err| ResizeError::Io(err.to_string()))?
}
