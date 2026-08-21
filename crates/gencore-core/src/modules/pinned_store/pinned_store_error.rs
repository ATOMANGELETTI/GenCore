use thiserror::Error;

/// Errors that can occur while reading or writing pinned tabs.
#[derive(Debug, Error)]
pub enum PinnedStoreError {
    /// The JSON payload exceeds [`super::PINNED_TABS_JSON_MAX_BYTES`].
    #[error("pinned tabs payload is too large")]
    TooLarge,
    /// The pinned-tabs file could not be read.
    #[error("failed to read pinned tabs: {0}")]
    Read(String),
    /// The pinned-tabs file could not be written.
    #[error("failed to write pinned tabs: {0}")]
    Write(String),
    /// [`tauri::path::PathResolver::app_data_dir`] returned an error.
    #[error("application data directory is unavailable")]
    AppDataDir,
}

impl serde::Serialize for PinnedStoreError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
