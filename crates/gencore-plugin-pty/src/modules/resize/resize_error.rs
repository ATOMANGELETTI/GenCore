use thiserror::Error;

/// Errors surfaced by the pty `resize` command.
#[derive(Debug, Error)]
pub enum ResizeError {
    /// The pty resize backend has not been implemented yet.
    #[error("pty resize support is not implemented yet")]
    NotImplemented,
}

impl serde::Serialize for ResizeError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
