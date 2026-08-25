use thiserror::Error;

/// Errors surfaced by the fs `delete` command.
#[derive(Debug, Error)]
pub enum DeleteError {
    /// A path does not exist.
    #[error("path not found")]
    NotFound,
    /// The process is not allowed to delete a path.
    #[error("permission denied")]
    PermissionDenied,
    /// Another error occurred while moving a path to the Recycle Bin.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for DeleteError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
