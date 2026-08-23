//! Transport abstraction between the turn loop and the Gemini Developer API.
//!
//! `send_turn` / `resume_turn` depend only on [`GeminiTransport`], so tests
//! can swap in [`ScriptedTransport`] instead of a real HTTP call. Task 7's
//! `ReqwestTransport` implements the same trait with a streaming POST to
//! `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse`,
//! sending the unwrapped API key as the `x-goog-api-key` header and parsing
//! each `data: ` line with [`super::gemini_parse::parse_sse_data`]. The key
//! never appears in a [`GeminiEvent`] or gets logged.

use super::gemini_error::GeminiError;
use super::gemini_models::GeminiRequest;
use super::gemini_parse::GeminiEvent;

/// One full turn call to the Gemini Developer API: a request in, the fully
/// decoded stream of events out.
pub trait GeminiTransport {
    fn generate(&self, request: GeminiRequest) -> Result<Vec<GeminiEvent>, GeminiError>;
}

/// Test double: returns a fixed list of events for every request, never
/// touching the network.
pub struct ScriptedTransport {
    pub events: Vec<GeminiEvent>,
}

impl GeminiTransport for ScriptedTransport {
    fn generate(&self, _request: GeminiRequest) -> Result<Vec<GeminiEvent>, GeminiError> {
        Ok(self.events.clone())
    }
}
