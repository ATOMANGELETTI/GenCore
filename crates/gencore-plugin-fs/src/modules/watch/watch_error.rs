use thiserror::Error;

/// Errors surfaced by the fs `watch` command.
#[derive(Debug, Error)]
pub enum WatchError {
    /// The filesystem watch backend has not been implemented yet.
    #[error("fs watch support is not implemented yet")]
    NotImplemented,
}

impl serde::Serialize for WatchError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
