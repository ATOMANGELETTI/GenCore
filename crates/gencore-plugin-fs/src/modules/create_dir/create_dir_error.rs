use thiserror::Error;

/// Errors surfaced by the fs `create_dir` command.
#[derive(Debug, Error)]
pub enum CreateDirError {
    /// The path already exists.
    #[error("path already exists")]
    AlreadyExists,
    /// The final path component is not a legal Windows file name.
    #[error("invalid file name")]
    InvalidName,
    /// A parent of the path does not exist.
    #[error("path not found")]
    NotFound,
    /// The process is not allowed to create the directory.
    #[error("permission denied")]
    PermissionDenied,
    /// Another I/O error occurred while creating the directory.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for CreateDirError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub(super) fn map_io(err: std::io::Error) -> CreateDirError {
    match err.kind() {
        std::io::ErrorKind::AlreadyExists => CreateDirError::AlreadyExists,
        std::io::ErrorKind::NotFound => CreateDirError::NotFound,
        std::io::ErrorKind::PermissionDenied => CreateDirError::PermissionDenied,
        _ => CreateDirError::Io(err.to_string()),
    }
}
