use std::cmp::Ordering;
use std::fs::DirEntry;
use std::path::Path;

use serde::{Deserialize, Serialize};

use super::list_error::{ListError, map_io};
use crate::modules::path_util::{
    extension_of, file_attributes, is_hidden, is_system, normalize_path, system_time_to_ms,
};

/// Arguments for listing the contents of a directory.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ListArgs {
    /// Path of the directory to list.
    pub path: String,
}

/// Kind of a directory entry.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FsKind {
    /// A regular file.
    File,
    /// A directory.
    Dir,
    /// A symbolic link (including to a directory).
    Symlink,
}

/// A single entry returned by [`list`].
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FsEntry {
    /// File or folder name.
    pub name: String,
    /// Normalized absolute path.
    pub path: String,
    /// Entry kind. Symlinks stay [`FsKind::Symlink`] even when the target is a directory.
    pub kind: FsKind,
    /// Extension without the leading dot, if any.
    pub extension: Option<String>,
    /// Hidden by Windows `FILE_ATTRIBUTE_HIDDEN` or a leading `.` in the name.
    pub hidden: bool,
    /// Windows `FILE_ATTRIBUTE_SYSTEM`; always `false` on other platforms.
    pub system: bool,
    /// Size in bytes. `None` for directories and symlinks-to-directories.
    pub size: Option<u64>,
    /// Last-modified time in milliseconds since the Unix epoch, when available.
    pub modified_ms: Option<i64>,
}

/// Directory listing returned by [`list`].
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ListResult {
    /// Entries sorted with directories (and symlink-to-dir) first, then by case-insensitive name.
    pub entries: Vec<FsEntry>,
}

/// Lists the contents of a directory.
#[tauri::command]
pub async fn list(path: String) -> Result<ListResult, ListError> {
    tauri::async_runtime::spawn_blocking(move || list_blocking(path))
        .await
        .map_err(|err| ListError::Io(err.to_string()))?
}

fn list_blocking(path: String) -> Result<ListResult, ListError> {
    let path = normalize_path(&path);
    let metadata = std::fs::metadata(&path).map_err(map_io)?;
    if !metadata.is_dir() {
        return Err(ListError::NotADirectory);
    }

    let mut entries = Vec::new();
    for entry in std::fs::read_dir(&path).map_err(map_io)? {
        let entry = entry.map_err(map_io)?;
        entries.push(fs_entry_from_dir_entry(&entry)?);
    }

    entries.sort_by(compare_entries);
    Ok(ListResult { entries })
}

fn fs_entry_from_dir_entry(entry: &DirEntry) -> Result<FsEntry, ListError> {
    let name = entry.file_name().to_string_lossy().into_owned();
    let path = normalize_path(&entry.path().to_string_lossy());
    let file_type = entry.file_type().map_err(map_io)?;
    let kind = if file_type.is_symlink() {
        FsKind::Symlink
    } else if file_type.is_dir() {
        FsKind::Dir
    } else {
        FsKind::File
    };
    let metadata = entry.metadata().map_err(map_io)?;
    let attrs = file_attributes(&metadata);

    Ok(FsEntry {
        extension: extension_of(&name),
        hidden: is_hidden(&name, attrs),
        system: is_system(attrs),
        size: if kind == FsKind::File {
            Some(metadata.len())
        } else {
            None
        },
        modified_ms: metadata.modified().ok().and_then(system_time_to_ms),
        name,
        path,
        kind,
    })
}

fn compare_entries(a: &FsEntry, b: &FsEntry) -> Ordering {
    match (sorts_as_directory(a), sorts_as_directory(b)) {
        (true, false) => Ordering::Less,
        (false, true) => Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    }
}

fn sorts_as_directory(entry: &FsEntry) -> bool {
    match entry.kind {
        FsKind::Dir => true,
        FsKind::Symlink => Path::new(&entry.path).is_dir(),
        FsKind::File => false,
    }
}
