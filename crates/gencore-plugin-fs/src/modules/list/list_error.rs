use thiserror::Error;

/// Errors surfaced by the fs `list` command.
#[derive(Debug, Error)]
pub enum ListError {
    /// The directory listing backend has not been implemented yet.
    #[error("fs list support is not implemented yet")]
    NotImplemented,
}

impl serde::Serialize for ListError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
