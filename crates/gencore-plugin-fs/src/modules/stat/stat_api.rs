use serde::Deserialize;

use super::stat_error::StatError;

/// Arguments for reading metadata about a path.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StatArgs {
    /// Path to read metadata for.
    pub path: String,
}

/// Reads metadata about a file or directory.
///
/// Stub implementation: real filesystem access is not implemented yet.
#[tauri::command]
pub async fn stat(_args: StatArgs) -> Result<(), StatError> {
    Err(StatError::NotImplemented)
}
