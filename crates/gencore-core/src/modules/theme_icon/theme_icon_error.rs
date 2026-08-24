use thiserror::Error;

/// Errors produced by the `theme_icon` module.
#[derive(Debug, Error)]
pub enum ThemeIconError {
    #[error("main window is missing")]
    WindowMissing,

    #[error("failed to decode icon image: {0}")]
    Image(String),
}
