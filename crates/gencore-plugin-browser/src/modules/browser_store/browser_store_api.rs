use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager, Runtime};

use super::browser_store_error::BrowserStoreError;

/// Maximum accepted UTF-8 byte length for any browser store payload.
pub const BROWSER_STORE_JSON_MAX_BYTES: usize = 16 * 1024 * 1024;

/// File name of the bookmarks JSON store, under the app data directory.
pub const BOOKMARKS_FILE_NAME: &str = "bookmarks.json";
/// File name of the history JSON store, under the app data directory.
pub const HISTORY_FILE_NAME: &str = "history.json";
/// File name of the downloads JSON store, under the app data directory.
pub const DOWNLOADS_FILE_NAME: &str = "downloads.json";

/// JSON returned when the bookmarks file does not exist yet.
pub const DEFAULT_BOOKMARKS_JSON: &str = "{\"version\":1,\"bookmarks\":[]}";
/// JSON returned when the history file does not exist yet.
pub const DEFAULT_HISTORY_JSON: &str = "{\"version\":1,\"entries\":[]}";
/// JSON returned when the downloads file does not exist yet.
pub const DEFAULT_DOWNLOADS_JSON: &str = "{\"version\":1,\"downloads\":[]}";

/// Returns `{app_data_dir}/{file_name}`.
pub fn store_path(app_data_dir: &Path, file_name: &str) -> PathBuf {
    app_data_dir.join(file_name)
}

/// Reads a store file, or `default_json` when it is missing.
pub fn read_store_file(path: &Path, default_json: &str) -> Result<String, BrowserStoreError> {
    match std::fs::read_to_string(path) {
        Ok(json) => Ok(json),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(default_json.to_string()),
        Err(err) => Err(BrowserStoreError::Read(err.to_string())),
    }
}

/// Writes `json` to `path`, creating parent directories as needed.
pub fn write_store_file(path: &Path, json: &str) -> Result<(), BrowserStoreError> {
    if json.len() > BROWSER_STORE_JSON_MAX_BYTES {
        return Err(BrowserStoreError::TooLarge);
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|err| BrowserStoreError::Write(err.to_string()))?;
    }
    std::fs::write(path, json).map_err(|err| BrowserStoreError::Write(err.to_string()))
}

fn app_data_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, BrowserStoreError> {
    app.path()
        .app_data_dir()
        .map_err(|_| BrowserStoreError::AppDataDir)
}

/// Loads bookmarks JSON from the application data directory.
#[tauri::command]
pub async fn load_bookmarks<R: Runtime>(app: AppHandle<R>) -> Result<String, BrowserStoreError> {
    read_store_file(
        &store_path(&app_data_dir(&app)?, BOOKMARKS_FILE_NAME),
        DEFAULT_BOOKMARKS_JSON,
    )
}

/// Saves bookmarks JSON to the application data directory.
#[tauri::command]
pub async fn save_bookmarks<R: Runtime>(
    app: AppHandle<R>,
    json: String,
) -> Result<(), BrowserStoreError> {
    write_store_file(
        &store_path(&app_data_dir(&app)?, BOOKMARKS_FILE_NAME),
        &json,
    )
}

/// Loads history JSON from the application data directory.
#[tauri::command]
pub async fn load_history<R: Runtime>(app: AppHandle<R>) -> Result<String, BrowserStoreError> {
    read_store_file(
        &store_path(&app_data_dir(&app)?, HISTORY_FILE_NAME),
        DEFAULT_HISTORY_JSON,
    )
}

/// Saves history JSON to the application data directory.
#[tauri::command]
pub async fn save_history<R: Runtime>(
    app: AppHandle<R>,
    json: String,
) -> Result<(), BrowserStoreError> {
    write_store_file(&store_path(&app_data_dir(&app)?, HISTORY_FILE_NAME), &json)
}

/// Loads the downloads list JSON from the application data directory.
#[tauri::command]
pub async fn load_downloads<R: Runtime>(app: AppHandle<R>) -> Result<String, BrowserStoreError> {
    read_store_file(
        &store_path(&app_data_dir(&app)?, DOWNLOADS_FILE_NAME),
        DEFAULT_DOWNLOADS_JSON,
    )
}

/// Saves the downloads list JSON to the application data directory.
#[tauri::command]
pub async fn save_downloads<R: Runtime>(
    app: AppHandle<R>,
    json: String,
) -> Result<(), BrowserStoreError> {
    write_store_file(
        &store_path(&app_data_dir(&app)?, DOWNLOADS_FILE_NAME),
        &json,
    )
}
