use std::path::Path;

use serde::Deserialize;

use super::copy_error::{CopyError, map_io};
use crate::modules::path_util::{
    copy_recursive, final_path_component, normalize_path, unique_destination,
};

/// Arguments for copying one or more paths into a destination directory.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CopyArgs {
    /// Files or directories to copy.
    pub paths: Vec<String>,
    /// Directory the entries are copied into.
    pub destination_dir: String,
}

/// Copies files/directories (recursively) into `destination_dir`. On a name
/// collision, the copy is auto-suffixed (`name (2)`, `name (3)`, …) rather
/// than overwriting the existing entry.
///
/// `rename_all = "snake_case"` matches the literal `destination_dir` key the
/// JS wrapper sends; Tauri otherwise defaults argument keys to camelCase.
#[tauri::command(rename_all = "snake_case")]
pub async fn copy(paths: Vec<String>, destination_dir: String) -> Result<(), CopyError> {
    tauri::async_runtime::spawn_blocking(move || copy_blocking(paths, destination_dir))
        .await
        .map_err(|err| CopyError::Io(err.to_string()))?
}

fn copy_blocking(paths: Vec<String>, destination_dir: String) -> Result<(), CopyError> {
    let destination_dir = normalize_path(&destination_dir);
    let dest_metadata = std::fs::metadata(&destination_dir).map_err(map_io)?;
    if !dest_metadata.is_dir() {
        return Err(CopyError::DestinationNotADirectory);
    }

    for source in &paths {
        let source = normalize_path(source);
        let name = final_path_component(&source);
        let target = unique_destination(&destination_dir, name);
        copy_recursive(Path::new(&source), Path::new(&target)).map_err(map_io)?;
    }
    Ok(())
}
