use thiserror::Error;

/// Typed errors for Gemini request building, SSE parsing, and (later) HTTP transport.
#[derive(Debug, Error)]
pub enum GeminiError {
    /// The model string is not one of the allowed Config IDs.
    #[error("invalid model")]
    InvalidModel,
    /// The SSE `data:` payload was not a JSON object Gemini's API would emit.
    #[error("could not parse Gemini SSE payload")]
    InvalidPayload,
    /// The real network call has not been wired up yet (lands in a later task).
    #[error("Gemini network call is not implemented yet")]
    NotImplemented,
    /// The HTTP request failed, or Gemini responded with a non-2xx status.
    /// Never includes the API key.
    #[error("Gemini HTTP request failed: {0}")]
    Http(String),
    /// `cancel_turn` tripped the cancellation flag while the SSE stream was
    /// still being read. No assistant message or pending tool call is
    /// persisted for a turn that ends this way.
    #[error("Gemini turn was cancelled")]
    Cancelled,
}

impl serde::Serialize for GeminiError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
