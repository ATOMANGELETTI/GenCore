use thiserror::Error;

/// Errors surfaced by the fs `list_drives` command.
#[derive(Debug, Error)]
pub enum ListDrivesError {
    /// Drive enumeration failed.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for ListDrivesError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
