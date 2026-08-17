use thiserror::Error;

/// Errors surfaced by the fs `unwatch` command.
#[derive(Debug, Error)]
pub enum UnwatchError {
    /// An I/O error occurred while stopping the watcher.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for UnwatchError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
