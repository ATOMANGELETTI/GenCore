use thiserror::Error;

use crate::modules::store::StoreError;

/// Typed errors for assistant settings and later IPC/agent work.
///
/// Variants must never include secret material in [`Display`] or [`Debug`].
#[derive(Debug, Error)]
pub enum AssistantError {
    /// The model string is not one of the four Config IDs.
    #[error("invalid model")]
    InvalidModel,
    /// The tool call id does not exist, or its status is not `pending`.
    #[error("tool call is not pending")]
    ActionNotPending,
    /// The conversation has no live pty session to write to: the latest
    /// snapshot has no `active_session_id`, the caller passed no session
    /// map, or the session map no longer holds that session.
    #[error("pty session is no longer available")]
    PtySessionGone,
    /// A tool call's name or `args_json` could not be turned into an action.
    #[error("invalid tool arguments")]
    InvalidArgs,
    /// The pty session exists but the write itself failed.
    #[error("pty write failed: {0}")]
    Pty(String),
    /// The underlying store operation failed.
    #[error(transparent)]
    Store(#[from] StoreError),
}

impl serde::Serialize for AssistantError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
