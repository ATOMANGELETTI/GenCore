use serde::Deserialize;

use super::create_dir_error::{CreateDirError, map_io};
use crate::modules::path_util::{final_path_component, normalize_path, validate_windows_file_name};

/// Arguments for creating a directory.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateDirArgs {
    /// Path of the directory to create.
    pub path: String,
}

/// Creates a new directory. Does not create missing parents.
#[tauri::command]
pub async fn create_dir(args: CreateDirArgs) -> Result<(), CreateDirError> {
    let path = normalize_path(&args.path);
    let name = final_path_component(&path);
    if !validate_windows_file_name(name) {
        return Err(CreateDirError::InvalidName);
    }

    std::fs::create_dir(&path).map_err(map_io)?;
    Ok(())
}
