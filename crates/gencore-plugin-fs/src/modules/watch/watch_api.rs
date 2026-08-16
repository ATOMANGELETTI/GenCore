use serde::Deserialize;

use super::watch_error::WatchError;

/// Arguments for watching a path for filesystem changes.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WatchArgs {
    /// Path to watch.
    pub path: String,
    /// Whether to watch subdirectories recursively.
    pub recursive: bool,
}

/// Watches a file or directory for changes.
///
/// Stub implementation: real filesystem watching is not implemented yet.
#[tauri::command]
pub async fn watch(_args: WatchArgs) -> Result<(), WatchError> {
    Err(WatchError::NotImplemented)
}
