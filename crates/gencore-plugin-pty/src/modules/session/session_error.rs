use thiserror::Error;

/// Errors surfaced by pty session lifecycle commands (`open`, `close`).
#[derive(Debug, Error)]
pub enum SessionError {
    /// The pty session backend has not been implemented yet.
    #[error("pty session support is not implemented yet")]
    NotImplemented,
}

impl serde::Serialize for SessionError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
