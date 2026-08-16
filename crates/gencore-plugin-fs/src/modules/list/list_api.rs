use serde::Deserialize;

use super::list_error::ListError;

/// Arguments for listing the contents of a directory.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ListArgs {
    /// Path of the directory to list.
    pub path: String,
}

/// Lists the contents of a directory.
///
/// Stub implementation: real filesystem access is not implemented yet.
#[tauri::command]
pub async fn list(_args: ListArgs) -> Result<(), ListError> {
    Err(ListError::NotImplemented)
}
