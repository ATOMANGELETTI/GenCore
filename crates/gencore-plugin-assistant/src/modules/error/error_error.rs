use thiserror::Error;

use crate::modules::secrets::SecretsError;
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
    /// No usable Gemini API key is stored (missing, or the DPAPI blob no
    /// longer unprotects for this user) — `send_turn` cannot call Gemini.
    #[error("no Gemini API key configured")]
    NoApiKey,
    /// The Gemini transport call itself failed (network, non-2xx, or a
    /// stream Gemini's API would never emit).
    #[error("Gemini request failed: {0}")]
    Gemini(String),
    /// The underlying store operation failed.
    #[error(transparent)]
    Store(#[from] StoreError),
    /// DPAPI (or the identity mock) failed to protect/unprotect a secret.
    #[error(transparent)]
    Secrets(#[from] SecretsError),
    /// A `tauri::async_runtime::spawn_blocking` task panicked or was cancelled.
    #[error("background task failed: {0}")]
    TaskJoin(String),
}

impl serde::Serialize for AssistantError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
