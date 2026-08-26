use thiserror::Error;

/// Errors produced by the `theme_icon` module.
#[derive(Debug, Error)]
pub enum ThemeIconError {
    #[error("main window is missing")]
    WindowMissing,

    #[error("failed to decode icon image: {0}")]
    Image(String),

    #[error("failed to apply window icon: {0}")]
    WindowIcon(String),

    #[error("failed to apply taskbar icon: {0}")]
    TaskbarIcon(String),

    #[error("failed to apply tray icon: {0}")]
    TrayIcon(String),

    #[error("invalid icon rgba buffer")]
    InvalidRgba,
}
