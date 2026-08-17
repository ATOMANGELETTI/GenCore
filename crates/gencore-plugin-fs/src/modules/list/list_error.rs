use thiserror::Error;

/// Errors surfaced by the fs `list` command.
#[derive(Debug, Error)]
pub enum ListError {
    /// The path does not exist.
    #[error("path not found")]
    NotFound,
    /// The path exists but is not a directory.
    #[error("path is not a directory")]
    NotADirectory,
    /// The process is not allowed to read the directory.
    #[error("permission denied")]
    PermissionDenied,
    /// Another I/O error occurred while listing the directory.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for ListError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub(super) fn map_io(err: std::io::Error) -> ListError {
    match err.kind() {
        std::io::ErrorKind::NotFound => ListError::NotFound,
        std::io::ErrorKind::PermissionDenied => ListError::PermissionDenied,
        std::io::ErrorKind::NotADirectory => ListError::NotADirectory,
        _ => ListError::Io(err.to_string()),
    }
}
