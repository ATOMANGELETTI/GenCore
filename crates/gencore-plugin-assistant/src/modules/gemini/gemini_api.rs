//! Gemini Developer API HTTP transport.
//!
//! Task 6 wires this up to `reqwest`'s streaming client. Until then this
//! stays a no-op stub — it holds the request/response types steady for
//! callers to build against, but it never touches the network.

use reqwest::Client;

use super::gemini_error::GeminiError;
use super::gemini_models::GeminiRequest;
use super::gemini_parse::GeminiEvent;

/// Streams one turn from the Gemini Developer API.
///
/// Stub only: always returns [`GeminiError::NotImplemented`] without making
/// any network call. Task 6 replaces the body with a real SSE request built
/// from `client`, `api_key`, and `request`.
#[allow(dead_code)]
pub async fn stream_turn(
    _client: &Client,
    _api_key: &str,
    _request: &GeminiRequest,
) -> Result<Vec<GeminiEvent>, GeminiError> {
    Err(GeminiError::NotImplemented)
}
