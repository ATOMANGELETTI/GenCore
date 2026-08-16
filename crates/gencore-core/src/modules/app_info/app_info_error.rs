use thiserror::Error;

/// Errors that can occur while collecting application metadata.
#[derive(Debug, Error)]
pub enum AppInfoError {
    /// The application identifier configured in `tauri.conf.json` is empty.
    #[error("application identifier is not configured")]
    IdentifierMissing,
}
