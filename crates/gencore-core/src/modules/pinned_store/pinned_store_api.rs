use std::path::{Path, PathBuf};

use serde::Deserialize;
use tauri::{AppHandle, Manager, Runtime};

use super::pinned_store_error::PinnedStoreError;
use crate::modules::error::CoreError;

/// File name written under the application data directory.
pub const PINNED_TABS_FILE_NAME: &str = "pinned-tabs.json";
/// Maximum accepted UTF-8 byte length for a pinned-tabs payload.
pub const PINNED_TABS_JSON_MAX_BYTES: usize = 8 * 1024 * 1024;
/// JSON returned when the pinned-tabs file does not exist yet.
pub const DEFAULT_PINNED_TABS_JSON: &str = "{\"version\":1,\"activeId\":null,\"tabs\":[]}";

/// Arguments for [`save_pinned_tabs`].
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SavePinnedTabsArgs {
    /// Serialized pinned-tabs document to persist.
    pub json: String,
}

/// Returns `{app_data_dir}/pinned-tabs.json`.
pub fn pinned_tabs_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(PINNED_TABS_FILE_NAME)
}

/// Reads the pinned-tabs file, or [`DEFAULT_PINNED_TABS_JSON`] when it is missing.
pub fn read_pinned_tabs_file(path: &Path) -> Result<String, PinnedStoreError> {
    match std::fs::read_to_string(path) {
        Ok(json) => Ok(json),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            Ok(DEFAULT_PINNED_TABS_JSON.to_string())
        }
        Err(err) => Err(PinnedStoreError::Read(err.to_string())),
    }
}

/// Writes `json` to `path`, creating parent directories as needed.
pub fn write_pinned_tabs_file(path: &Path, json: &str) -> Result<(), PinnedStoreError> {
    if json.len() > PINNED_TABS_JSON_MAX_BYTES {
        return Err(PinnedStoreError::TooLarge);
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|err| PinnedStoreError::Write(err.to_string()))?;
    }
    std::fs::write(path, json).map_err(|err| PinnedStoreError::Write(err.to_string()))
}

/// Loads pinned tabs from the application data directory.
#[tauri::command]
pub async fn load_pinned_tabs<R: Runtime>(app: AppHandle<R>) -> Result<String, CoreError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| PinnedStoreError::AppDataDir)?;
    Ok(read_pinned_tabs_file(&pinned_tabs_path(&dir))?)
}

/// Saves pinned tabs into the application data directory.
#[tauri::command]
pub async fn save_pinned_tabs<R: Runtime>(
    app: AppHandle<R>,
    args: SavePinnedTabsArgs,
) -> Result<(), CoreError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|_| PinnedStoreError::AppDataDir)?;
    Ok(write_pinned_tabs_file(&pinned_tabs_path(&dir), &args.json)?)
}
