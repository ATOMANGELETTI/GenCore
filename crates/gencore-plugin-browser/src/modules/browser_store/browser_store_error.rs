use thiserror::Error;

/// Errors that can occur while reading or writing a browser JSON store file.
#[derive(Debug, Error)]
pub enum BrowserStoreError {
    /// The JSON payload exceeds the store's configured maximum size.
    #[error("payload is too large")]
    TooLarge,
    /// The store file could not be read.
    #[error("failed to read store file: {0}")]
    Read(String),
    /// The store file could not be written.
    #[error("failed to write store file: {0}")]
    Write(String),
    /// [`tauri::path::PathResolver::app_data_dir`] returned an error.
    #[error("application data directory is unavailable")]
    AppDataDir,
}

impl serde::Serialize for BrowserStoreError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
