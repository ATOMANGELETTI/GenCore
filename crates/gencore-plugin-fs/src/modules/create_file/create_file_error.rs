use thiserror::Error;

/// Errors surfaced by the fs `create_file` command.
#[derive(Debug, Error)]
pub enum CreateFileError {
    /// The path already exists.
    #[error("path already exists")]
    AlreadyExists,
    /// The final path component is not a legal Windows file name.
    #[error("invalid file name")]
    InvalidName,
    /// A parent of the path does not exist.
    #[error("path not found")]
    NotFound,
    /// The process is not allowed to create the file.
    #[error("permission denied")]
    PermissionDenied,
    /// Another I/O error occurred while creating the file.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for CreateFileError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub(super) fn map_io(err: std::io::Error) -> CreateFileError {
    match err.kind() {
        std::io::ErrorKind::AlreadyExists => CreateFileError::AlreadyExists,
        std::io::ErrorKind::NotFound => CreateFileError::NotFound,
        std::io::ErrorKind::PermissionDenied => CreateFileError::PermissionDenied,
        _ => CreateFileError::Io(err.to_string()),
    }
}
