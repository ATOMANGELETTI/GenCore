use std::fs::OpenOptions;

use serde::Deserialize;

use super::create_file_error::{CreateFileError, map_io};
use crate::modules::path_util::{final_path_component, normalize_path, validate_windows_file_name};

/// Arguments for creating an empty file.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CreateFileArgs {
    /// Path of the file to create.
    pub path: String,
}

/// Creates a new empty file. Fails if the path already exists.
#[tauri::command]
pub async fn create_file(path: String) -> Result<(), CreateFileError> {
    tauri::async_runtime::spawn_blocking(move || create_file_blocking(path))
        .await
        .map_err(|err| CreateFileError::Io(err.to_string()))?
}

fn create_file_blocking(path: String) -> Result<(), CreateFileError> {
    let path = normalize_path(&path);
    let name = final_path_component(&path);
    if !validate_windows_file_name(name) {
        return Err(CreateFileError::InvalidName);
    }

    OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&path)
        .map_err(map_io)?;
    Ok(())
}
