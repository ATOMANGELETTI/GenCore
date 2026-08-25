use std::path::Path;

use serde::Deserialize;

use super::move_paths_error::{MoveError, map_io};
use crate::modules::path_util::{
    copy_recursive, final_path_component, normalize_path, unique_destination,
};

/// Arguments for moving one or more paths into a destination directory.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MoveArgs {
    /// Files or directories to move.
    pub paths: Vec<String>,
    /// Directory the entries are moved into.
    pub destination_dir: String,
}

/// Moves files/directories into `destination_dir` (cut-paste). Tries a fast
/// same-volume [`std::fs::rename`] first, falling back to a recursive copy
/// followed by deleting the original when rename fails (e.g. cross-volume).
/// On a name collision, the move is auto-suffixed (`name (2)`, `name (3)`, …)
/// rather than overwriting the existing entry.
///
/// `rename_all = "snake_case"` matches the literal `destination_dir` key the
/// JS wrapper sends; Tauri otherwise defaults argument keys to camelCase.
#[tauri::command(rename_all = "snake_case")]
pub async fn move_paths(paths: Vec<String>, destination_dir: String) -> Result<(), MoveError> {
    tauri::async_runtime::spawn_blocking(move || move_blocking(paths, destination_dir))
        .await
        .map_err(|err| MoveError::Io(err.to_string()))?
}

fn move_blocking(paths: Vec<String>, destination_dir: String) -> Result<(), MoveError> {
    let destination_dir = normalize_path(&destination_dir);
    let dest_metadata = std::fs::metadata(&destination_dir).map_err(map_io)?;
    if !dest_metadata.is_dir() {
        return Err(MoveError::DestinationNotADirectory);
    }

    for source in &paths {
        let source = normalize_path(source);
        let name = final_path_component(&source);
        let target = unique_destination(&destination_dir, name);
        move_one(Path::new(&source), Path::new(&target))?;
    }
    Ok(())
}

fn move_one(source: &Path, target: &Path) -> Result<(), MoveError> {
    if std::fs::rename(source, target).is_ok() {
        return Ok(());
    }

    // Likely a cross-volume move, which `rename` cannot do on Windows: copy
    // then remove the original.
    copy_recursive(source, target).map_err(map_io)?;
    remove_recursive(source).map_err(map_io)
}

fn remove_recursive(path: &Path) -> std::io::Result<()> {
    if std::fs::symlink_metadata(path)?.is_dir() {
        std::fs::remove_dir_all(path)
    } else {
        std::fs::remove_file(path)
    }
}
