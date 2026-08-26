use thiserror::Error;

/// Errors surfaced while resolving a download destination.
#[derive(Debug, Error)]
pub enum DownloadsError {
    /// The OS downloads directory could not be resolved.
    #[error("downloads directory is unavailable")]
    DownloadDirUnavailable,
}

impl serde::Serialize for DownloadsError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
