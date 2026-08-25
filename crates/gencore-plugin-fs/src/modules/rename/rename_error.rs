use thiserror::Error;

/// Errors surfaced by the fs `rename` command.
#[derive(Debug, Error)]
pub enum RenameError {
    /// The new name is not a legal Windows file name (including a path separator).
    #[error("invalid file name")]
    InvalidName,
    /// The path does not exist.
    #[error("path not found")]
    NotFound,
    /// An entry already exists at the destination.
    #[error("path already exists")]
    AlreadyExists,
    /// The process is not allowed to rename the path.
    #[error("permission denied")]
    PermissionDenied,
    /// Another I/O error occurred while renaming.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for RenameError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub(super) fn map_io(err: std::io::Error) -> RenameError {
    match err.kind() {
        std::io::ErrorKind::NotFound => RenameError::NotFound,
        std::io::ErrorKind::AlreadyExists => RenameError::AlreadyExists,
        std::io::ErrorKind::PermissionDenied => RenameError::PermissionDenied,
        _ => RenameError::Io(err.to_string()),
    }
}
