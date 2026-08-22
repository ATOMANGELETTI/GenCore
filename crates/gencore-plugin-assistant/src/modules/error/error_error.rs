use thiserror::Error;

/// Typed errors for assistant settings and later IPC/agent work.
///
/// Variants must never include secret material in [`Display`] or [`Debug`].
#[derive(Debug, Error)]
pub enum AssistantError {
    /// The model string is not one of the four Config IDs.
    #[error("invalid model")]
    InvalidModel,
}

impl serde::Serialize for AssistantError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
