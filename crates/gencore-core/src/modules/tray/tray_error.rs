use thiserror::Error;

/// Errors that can occur while applying a tray action.
#[derive(Debug, Error)]
pub enum TrayError {
    /// The `main` or `tray-menu` webview is not registered on the app.
    #[error("required window is missing")]
    WindowMissing,
}
