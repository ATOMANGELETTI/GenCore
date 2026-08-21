use thiserror::Error;

/// Errors surfaced by pty I/O commands (`write`).
#[derive(Debug, Error)]
pub enum IoError {
    /// No session exists for the given identifier.
    #[error("pty session not found")]
    SessionNotFound,
    /// Writing to the pty failed.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for IoError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
