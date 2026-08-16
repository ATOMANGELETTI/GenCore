use thiserror::Error;

/// Errors surfaced by the fs `stat` command.
#[derive(Debug, Error)]
pub enum StatError {
    /// The metadata lookup backend has not been implemented yet.
    #[error("fs stat support is not implemented yet")]
    NotImplemented,
}

impl serde::Serialize for StatError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
