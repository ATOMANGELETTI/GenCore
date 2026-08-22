//! Error mapping for the agent module's own dependency, `gencore_pty`.
//!
//! `confirm_tool` and `reject_tool` return the crate-wide
//! [`AssistantError`] directly rather than a separate agent error type, so
//! `write_session`'s [`IoError`] converts here instead of at the call site.

use gencore_pty::IoError;

use crate::modules::error::AssistantError;

impl From<IoError> for AssistantError {
    /// A missing session means the pty already closed underneath the
    /// snapshot; any other I/O failure is a live write that failed for a
    /// different reason and is not a "gone" session.
    fn from(err: IoError) -> Self {
        match err {
            IoError::SessionNotFound => Self::PtySessionGone,
            IoError::Io(message) => Self::Pty(message),
        }
    }
}
