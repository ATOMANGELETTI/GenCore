//! Transport abstraction between the turn loop and the Gemini Developer API.
//!
//! `send_turn` / `resume_turn` depend only on [`GeminiTransport`], so tests
//! can swap in [`ScriptedTransport`] instead of a real HTTP call. Task 7's
//! `ReqwestTransport` implements the same trait with a streaming POST to
//! `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse`,
//! sending the unwrapped API key as the `x-goog-api-key` header and parsing
//! each `data: ` line with [`super::gemini_parse::parse_sse_data`]. The key
//! never appears in a [`GeminiEvent`] or gets logged.

use std::time::Duration;

use super::gemini_error::GeminiError;
use super::gemini_models::GeminiRequest;
use super::gemini_parse::{GeminiEvent, parse_sse_data};

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

const GEMINI_API_BASE: &str = "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(120);

/// Real transport: a streaming POST to Gemini's `streamGenerateContent` SSE
/// endpoint. The unwrapped API key is sent once as the `x-goog-api-key`
/// header and is never logged, stored on a [`GeminiEvent`], or included in
/// any error message this type returns.
///
/// Runs on `reqwest::blocking` so [`GeminiTransport::generate`] can stay a
/// plain synchronous call; callers on the Tauri async runtime must invoke it
/// from inside `tauri::async_runtime::spawn_blocking`, never directly on an
/// async worker thread.
pub struct ReqwestTransport {
    pub api_key: String,
}

impl GeminiTransport for ReqwestTransport {
    fn generate(&self, request: GeminiRequest) -> Result<Vec<GeminiEvent>, GeminiError> {
        let url = format!(
            "{GEMINI_API_BASE}/{}:streamGenerateContent?alt=sse",
            request.model
        );
        let body = serde_json::json!({
            "systemInstruction": { "parts": [{ "text": request.system }] },
            "contents": request.contents,
            "tools": request.tools,
        });

        let client = reqwest::blocking::Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .map_err(|err| GeminiError::Http(err.to_string()))?;

        let response = client
            .post(&url)
            .header("x-goog-api-key", &self.api_key)
            .json(&body)
            .send()
            .map_err(|err| GeminiError::Http(err.to_string()))?;

        if !response.status().is_success() {
            return Err(GeminiError::Http(format!(
                "Gemini API returned status {}",
                response.status()
            )));
        }

        let text = response
            .text()
            .map_err(|err| GeminiError::Http(err.to_string()))?;

        let mut events = Vec::new();
        for line in text.lines() {
            let Some(data) = line.strip_prefix("data: ") else {
                continue;
            };
            if data == "[DONE]" {
                break;
            }
            events.extend(parse_sse_data(data)?);
        }
        Ok(events)
    }
}
