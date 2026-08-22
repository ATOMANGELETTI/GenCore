use std::path::{Path, PathBuf};

pub fn resolve_data_dir(exe_parent: &Path) -> PathBuf {
    if let Ok(dir) = std::env::var("GENCORE_DATA_DIR") {
        let trimmed = dir.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }
    exe_parent.join("data")
}

pub fn sqlite_path(data_dir: &Path) -> PathBuf {
    data_dir.join("gencore-assistant.sqlite")
}
