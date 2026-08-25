use thiserror::Error;

/// Errors surfaced by the fs `stat` command.
#[derive(Debug, Error)]
pub enum StatError {
    /// The path does not exist.
    #[error("path not found")]
    NotFound,
    /// The process is not allowed to read the path.
    #[error("permission denied")]
    PermissionDenied,
    /// Another I/O error occurred while reading metadata.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for StatError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub(super) fn map_io(err: std::io::Error) -> StatError {
    match err.kind() {
        std::io::ErrorKind::NotFound => StatError::NotFound,
        std::io::ErrorKind::PermissionDenied => StatError::PermissionDenied,
        _ => StatError::Io(err.to_string()),
    }
}
