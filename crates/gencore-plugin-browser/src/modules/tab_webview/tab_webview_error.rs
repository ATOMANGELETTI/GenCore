use thiserror::Error;

/// Errors surfaced by the browser `create_tab_webview` / `close_tab_webview` commands.
#[derive(Debug, Error)]
pub enum TabWebviewError {
    /// The `main` window could not be found.
    #[error("main window is unavailable")]
    MainWindowUnavailable,
    /// The requested URL could not be parsed.
    #[error("invalid url")]
    InvalidUrl,
    /// The URL scheme is not allowed for tab navigation.
    #[error("unsupported url scheme")]
    UnsupportedScheme,
    /// A webview with this label already exists.
    #[error("tab webview already exists")]
    AlreadyExists,
    /// The requested tab webview does not exist.
    #[error("tab webview not found")]
    NotFound,
    /// Tauri failed to create or close the webview.
    #[error("{0}")]
    Tauri(String),
}

impl serde::Serialize for TabWebviewError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
