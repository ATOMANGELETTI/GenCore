use serde::{Deserialize, Serialize};

use super::rename_error::{RenameError, map_io};
use crate::modules::path_util::{normalize_path, validate_windows_file_name};

/// Arguments for renaming a file or directory in place.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RenameArgs {
    /// Path of the file or directory to rename.
    pub path: String,
    /// New final path component. Must not contain a path separator.
    pub new_name: String,
}

/// Result of a successful rename.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct RenameResult {
    /// The renamed entry's new normalized path.
    pub path: String,
}

/// Renames a file or directory in place, keeping it in the same parent
/// directory. `new_name` is validated as a single Windows file-name
/// component, so this command cannot be used to move an entry elsewhere.
///
/// `rename_all = "snake_case"` matches the literal `new_name` key the JS
/// wrapper sends; Tauri otherwise defaults argument keys to camelCase.
#[tauri::command(rename_all = "snake_case")]
pub async fn rename(path: String, new_name: String) -> Result<RenameResult, RenameError> {
    tauri::async_runtime::spawn_blocking(move || rename_blocking(path, new_name))
        .await
        .map_err(|err| RenameError::Io(err.to_string()))?
}

fn rename_blocking(path: String, new_name: String) -> Result<RenameResult, RenameError> {
    let path = normalize_path(&path);
    if !validate_windows_file_name(&new_name) {
        return Err(RenameError::InvalidName);
    }

    let destination = sibling_path(&path, &new_name);
    if std::path::Path::new(&destination).exists() {
        return Err(RenameError::AlreadyExists);
    }

    std::fs::rename(&path, &destination).map_err(map_io)?;
    Ok(RenameResult { path: destination })
}

/// Replaces the final path component of `path` with `new_name`.
fn sibling_path(path: &str, new_name: &str) -> String {
    let trimmed = path.trim_end_matches(['\\', '/']);
    match trimmed.rfind(['\\', '/']) {
        Some(index) => format!("{}{}", &trimmed[..=index], new_name),
        None => new_name.to_owned(),
    }
}

#[cfg(test)]
mod tests {
    use super::sibling_path;

    #[test]
    fn sibling_path_replaces_final_component() {
        assert_eq!(
            sibling_path(r"C:\Users\dev\old.txt", "new.txt"),
            r"C:\Users\dev\new.txt"
        );
        assert_eq!(sibling_path(r"C:\old.txt", "new.txt"), r"C:\new.txt");
    }
}
