use thiserror::Error;

/// Errors surfaced by pty session lifecycle commands (`open`, `close`).
#[derive(Debug, Error)]
pub enum SessionError {
    /// No session exists for the given identifier.
    #[error("pty session not found")]
    SessionNotFound,
    /// Spawning the pty or shell failed.
    #[error("{0}")]
    SpawnFailed(String),
    /// The requested working directory is missing or not a directory.
    #[error("invalid working directory")]
    InvalidCwd,
    /// `theme` was set to something other than polar-night or snow-storm.
    #[error("invalid theme")]
    InvalidTheme,
    /// Another I/O or runtime error occurred.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for SessionError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
