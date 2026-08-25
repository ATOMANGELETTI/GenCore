use serde::Deserialize;

use super::delete_error::DeleteError;
use crate::modules::path_util::normalize_path;

/// Arguments for moving one or more paths to the Recycle Bin.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DeleteArgs {
    /// Paths to move to the Recycle Bin.
    pub paths: Vec<String>,
}

/// Moves one or more files or directories to the Recycle Bin.
#[tauri::command]
pub async fn delete(paths: Vec<String>) -> Result<(), DeleteError> {
    tauri::async_runtime::spawn_blocking(move || delete_blocking(paths))
        .await
        .map_err(|err| DeleteError::Io(err.to_string()))?
}

fn delete_blocking(paths: Vec<String>) -> Result<(), DeleteError> {
    if paths.is_empty() {
        return Ok(());
    }

    let normalized: Vec<String> = paths.iter().map(|path| normalize_path(path)).collect();
    for path in &normalized {
        if !std::path::Path::new(path).exists() {
            return Err(DeleteError::NotFound);
        }
    }

    // `trash`'s error type does not expose a stable NotFound/PermissionDenied
    // distinction across platforms; the existence check above already covers
    // the common case, so any remaining failure is reported as-is.
    trash::delete_all(&normalized).map_err(|err| DeleteError::Io(err.to_string()))
}
