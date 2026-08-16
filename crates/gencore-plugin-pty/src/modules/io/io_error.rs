use thiserror::Error;

/// Errors surfaced by pty I/O commands (`write`).
#[derive(Debug, Error)]
pub enum IoError {
    /// The pty I/O backend has not been implemented yet.
    #[error("pty write support is not implemented yet")]
    NotImplemented,
}

impl serde::Serialize for IoError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
