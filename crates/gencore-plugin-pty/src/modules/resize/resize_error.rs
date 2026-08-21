use thiserror::Error;

/// Errors surfaced by the pty `resize` command.
#[derive(Debug, Error)]
pub enum ResizeError {
    /// No session exists for the given identifier.
    #[error("pty session not found")]
    SessionNotFound,
    /// Resizing the pty failed.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for ResizeError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
