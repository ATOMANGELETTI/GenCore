use serde::{Deserialize, Serialize};

use super::stat_error::{StatError, map_io};
use crate::modules::list::FsKind;
use crate::modules::path_util::{
    extension_of, file_attributes, final_path_component, is_hidden, is_system, normalize_path,
    system_time_to_ms,
};

/// Arguments for reading metadata about a path.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StatArgs {
    /// Path to read metadata for.
    pub path: String,
}

/// Metadata for a single file or directory, returned by [`stat`].
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatResult {
    /// File or folder name.
    pub name: String,
    /// Normalized absolute path.
    pub path: String,
    /// Entry kind. Symlinks stay [`FsKind::Symlink`] even when the target is a directory.
    pub kind: FsKind,
    /// Extension without the leading dot, if any.
    pub extension: Option<String>,
    /// Size in bytes. `None` for directories and symlinks-to-directories.
    pub size: Option<u64>,
    /// Creation time in milliseconds since the Unix epoch, when available.
    pub created_ms: Option<i64>,
    /// Last-modified time in milliseconds since the Unix epoch, when available.
    pub modified_ms: Option<i64>,
    /// Last-accessed time in milliseconds since the Unix epoch, when available.
    pub accessed_ms: Option<i64>,
    /// Whether the entry is read-only.
    pub readonly: bool,
    /// Hidden by Windows `FILE_ATTRIBUTE_HIDDEN` or a leading `.` in the name.
    pub hidden: bool,
    /// Windows `FILE_ATTRIBUTE_SYSTEM`; always `false` on other platforms.
    pub system: bool,
}

/// Reads metadata about a file or directory.
#[tauri::command]
pub async fn stat(path: String) -> Result<StatResult, StatError> {
    tauri::async_runtime::spawn_blocking(move || stat_blocking(path))
        .await
        .map_err(|err| StatError::Io(err.to_string()))?
}

fn stat_blocking(path: String) -> Result<StatResult, StatError> {
    let path = normalize_path(&path);
    let metadata = std::fs::symlink_metadata(&path).map_err(map_io)?;
    let name = final_path_component(&path).to_owned();
    let attrs = file_attributes(&metadata);

    let file_type = metadata.file_type();
    let kind = if file_type.is_symlink() {
        FsKind::Symlink
    } else if file_type.is_dir() {
        FsKind::Dir
    } else {
        FsKind::File
    };

    Ok(StatResult {
        extension: extension_of(&name),
        hidden: is_hidden(&name, attrs),
        system: is_system(attrs),
        size: if kind == FsKind::File {
            Some(metadata.len())
        } else {
            None
        },
        created_ms: metadata.created().ok().and_then(system_time_to_ms),
        modified_ms: metadata.modified().ok().and_then(system_time_to_ms),
        accessed_ms: metadata.accessed().ok().and_then(system_time_to_ms),
        readonly: metadata.permissions().readonly(),
        name,
        path,
        kind,
    })
}
