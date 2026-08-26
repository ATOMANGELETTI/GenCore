use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, Runtime, webview::DownloadEvent};

/// Event emitted when a download starts (after the destination path is resolved).
pub const DOWNLOAD_STARTED_EVENT: &str = "gencore-browser://download-started";
/// Event emitted when a download finishes (success or failure).
pub const DOWNLOAD_FINISHED_EVENT: &str = "gencore-browser://download-finished";

/// Payload for [`DOWNLOAD_STARTED_EVENT`].
#[derive(Debug, Clone, Serialize)]
pub struct DownloadStartedPayload {
    /// The URL being downloaded.
    pub url: String,
    /// Absolute path the file will be saved to.
    pub path: String,
}

/// Payload for [`DOWNLOAD_FINISHED_EVENT`].
#[derive(Debug, Clone, Serialize)]
pub struct DownloadFinishedPayload {
    /// The URL that was downloaded.
    pub url: String,
    /// Absolute path the file was saved to, if known.
    pub path: Option<String>,
    /// Whether the download succeeded.
    pub success: bool,
}

/// Picks a non-colliding file name inside `dir` for `preferred_name`, appending
/// ` (2)`, ` (3)`, … before the extension when a file already exists.
pub fn unique_destination(dir: &std::path::Path, preferred_name: &str) -> PathBuf {
    let candidate = dir.join(preferred_name);
    if !candidate.exists() {
        return candidate;
    }

    let path = std::path::Path::new(preferred_name);
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("download");
    let extension = path.extension().and_then(|s| s.to_str());

    for attempt in 2.. {
        let name = match extension {
            Some(ext) => format!("{stem} ({attempt}).{ext}"),
            None => format!("{stem} ({attempt})"),
        };
        let candidate = dir.join(name);
        if !candidate.exists() {
            return candidate;
        }
    }
    unreachable!("file name suffix search does not terminate")
}

/// Handles a [`DownloadEvent`] from a tab webview's `on_download` hook.
///
/// Redirects every download into the OS Downloads directory (auto-suffixing name
/// collisions instead of overwriting) and emits [`DOWNLOAD_STARTED_EVENT`] /
/// [`DOWNLOAD_FINISHED_EVENT`] so the frontend downloads panel can track progress.
/// Always allows the download to proceed.
pub fn handle_download_event<R: Runtime>(app: &AppHandle<R>, event: DownloadEvent<'_>) -> bool {
    match event {
        DownloadEvent::Requested { url, destination } => {
            let Ok(download_dir) = app.path().download_dir() else {
                return false;
            };
            let preferred_name = destination
                .file_name()
                .and_then(|n| n.to_str())
                .map(str::to_owned)
                .filter(|n| !n.is_empty())
                .unwrap_or_else(|| "download".to_string());

            let resolved = unique_destination(&download_dir, &preferred_name);
            let path_string = resolved.to_string_lossy().into_owned();
            *destination = resolved;

            let _ = app.emit(
                DOWNLOAD_STARTED_EVENT,
                DownloadStartedPayload {
                    url: url.to_string(),
                    path: path_string,
                },
            );
            true
        }
        DownloadEvent::Finished { url, path, success } => {
            let _ = app.emit(
                DOWNLOAD_FINISHED_EVENT,
                DownloadFinishedPayload {
                    url: url.to_string(),
                    path: path.map(|p| p.to_string_lossy().into_owned()),
                    success,
                },
            );
            true
        }
        _ => true,
    }
}
