use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};

use super::app_info_error::AppInfoError;
use crate::modules::error::CoreError;

/// Snapshot of application metadata exposed to the frontend.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AppInfo {
    /// Product name from `tauri.conf.json` / `Cargo.toml`.
    pub name: String,
    /// Application version.
    pub version: String,
    /// Bundle/application identifier.
    pub identifier: String,
}

/// Returns metadata about the running application.
///
/// Reads directly from the [`AppHandle`]; it does not take any arguments.
#[tauri::command]
pub async fn get_app_info<R: Runtime>(app: AppHandle<R>) -> Result<AppInfo, CoreError> {
    let identifier = app.config().identifier.clone();
    if identifier.is_empty() {
        return Err(AppInfoError::IdentifierMissing.into());
    }

    let package_info = app.package_info();
    Ok(AppInfo {
        name: package_info.name.clone(),
        version: package_info.version.to_string(),
        identifier,
    })
}
