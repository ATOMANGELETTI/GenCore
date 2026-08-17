use std::sync::{Arc, Mutex};

use serde::Deserialize;
use tauri::State;

use super::unwatch_error::UnwatchError;
use crate::modules::path_util::normalize_path;
use crate::modules::watch::WatchMap;

/// Arguments for stopping a filesystem watch.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UnwatchArgs {
    /// Path that was previously passed to `watch`.
    pub path: String,
}

/// Stops watching `path`. A path that is not watched is a no-op.
pub fn stop_watch(registry: &Arc<Mutex<WatchMap>>, path: &str) -> Result<(), UnwatchError> {
    let key = normalize_path(path);
    registry.lock().expect("watch registry mutex").remove(&key);
    Ok(())
}

/// Stops watching a path for filesystem changes.
#[tauri::command]
pub async fn unwatch(
    state: State<'_, Arc<Mutex<WatchMap>>>,
    path: String,
) -> Result<(), UnwatchError> {
    let registry = Arc::clone(state.inner());
    tauri::async_runtime::spawn_blocking(move || stop_watch(&registry, &path))
        .await
        .map_err(|err| UnwatchError::Io(err.to_string()))?
}
