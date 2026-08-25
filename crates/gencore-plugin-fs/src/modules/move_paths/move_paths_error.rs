use thiserror::Error;

/// Errors surfaced by the fs `move_paths` command.
#[derive(Debug, Error)]
pub enum MoveError {
    /// The destination is not a directory.
    #[error("destination is not a directory")]
    DestinationNotADirectory,
    /// A source or the destination does not exist.
    #[error("path not found")]
    NotFound,
    /// The process is not allowed to read a source or write the destination.
    #[error("permission denied")]
    PermissionDenied,
    /// Another I/O error occurred while moving.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for MoveError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub(super) fn map_io(err: std::io::Error) -> MoveError {
    match err.kind() {
        std::io::ErrorKind::NotFound => MoveError::NotFound,
        std::io::ErrorKind::PermissionDenied => MoveError::PermissionDenied,
        _ => MoveError::Io(err.to_string()),
    }
}
