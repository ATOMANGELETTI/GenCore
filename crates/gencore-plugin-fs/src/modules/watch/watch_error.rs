use thiserror::Error;

use notify_debouncer_full::notify::{Error as NotifyError, ErrorKind};

/// Errors surfaced by the fs `watch` command.
#[derive(Debug, Error)]
pub enum WatchError {
    /// The UI requested a recursive watch, which this plugin does not support.
    #[error("recursive watches are not supported")]
    RecursiveNotSupported,
    /// The path does not exist.
    #[error("path not found")]
    NotFound,
    /// The process is not allowed to watch the path.
    #[error("permission denied")]
    PermissionDenied,
    /// Another I/O error occurred while starting the watcher.
    #[error("{0}")]
    Io(String),
}

impl serde::Serialize for WatchError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub(super) fn map_notify_error(err: NotifyError) -> WatchError {
    if matches!(err.kind, ErrorKind::PathNotFound) {
        return WatchError::NotFound;
    }
    if let ErrorKind::Io(io_err) = &err.kind {
        return match io_err.kind() {
            std::io::ErrorKind::NotFound => WatchError::NotFound,
            std::io::ErrorKind::PermissionDenied => WatchError::PermissionDenied,
            _ => WatchError::Io(io_err.to_string()),
        };
    }
    WatchError::Io(err.to_string())
}
