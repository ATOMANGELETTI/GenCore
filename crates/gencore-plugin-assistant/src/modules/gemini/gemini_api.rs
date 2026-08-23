//! Transport abstraction between the turn loop and the Gemini Developer API.
//!
//! `send_turn` / `resume_turn` depend only on [`GeminiTransport`], so tests
//! can swap in [`ScriptedTransport`] instead of a real HTTP call. Task 7's
//! `ReqwestTransport` implements the same trait with a streaming POST to
//! `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse`,
//! sending the unwrapped API key as the `x-goog-api-key` header and parsing
//! each `data: ` line with [`read_sse_events`] (backed by
//! [`super::gemini_parse::parse_sse_data`]). The key never appears in a
//! [`GeminiEvent`] or gets logged.

use std::io::{BufRead, BufReader, Read};
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
///
/// `on_event` is called once per [`GeminiEvent`] as it is parsed off the SSE
/// stream — the IPC layer uses it to emit `gencore-assistant://token` per
/// text delta instead of buffering the whole response. `is_cancelled` is
/// polled between SSE lines; once it reports `true`, `generate` stops
/// reading and returns [`GeminiError::Cancelled`] without finishing the
/// stream.
pub struct ReqwestTransport<'a> {
    pub api_key: String,
    pub on_event: &'a (dyn Fn(&GeminiEvent) + Send + Sync),
    pub is_cancelled: &'a (dyn Fn() -> bool + Send + Sync),
}

impl GeminiTransport for ReqwestTransport<'_> {
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

        if (self.is_cancelled)() {
            return Err(GeminiError::Cancelled);
        }

        let client = reqwest::blocking::Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .build()
            .map_err(|err| GeminiError::Http(err.to_string()))?;

        if (self.is_cancelled)() {
            return Err(GeminiError::Cancelled);
        }

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

        // Read incrementally (`BufRead` over the still-open response body,
        // which implements `Read`) instead of `.text()`-ing the whole SSE
        // body: that is what lets `on_event` fire per delta and
        // `is_cancelled` cut the stream short mid-turn.
        let reader = BufReader::new(response);
        read_sse_events(reader, &mut |event| (self.on_event)(event), &|| {
            (self.is_cancelled)()
        })
    }
}

/// Reads Gemini SSE `data: ` lines from `reader` one at a time, parsing each
/// with [`parse_sse_data`] and calling `on_event` for every decoded
/// [`GeminiEvent`] before appending it to the returned list.
///
/// `is_cancelled` is polled before each line is read; the moment it reports
/// `true` this returns [`GeminiError::Cancelled`] immediately, without
/// reading, parsing, or emitting that next line. This is the incremental
/// reader [`ReqwestTransport::generate`] delegates to — kept as a free
/// function so tests can drive it against an in-memory reader instead of a
/// live HTTP response.
pub fn read_sse_events<R: Read>(
    mut reader: BufReader<R>,
    on_event: &mut dyn FnMut(&GeminiEvent),
    is_cancelled: &dyn Fn() -> bool,
) -> Result<Vec<GeminiEvent>, GeminiError> {
    let mut events = Vec::new();
    let mut line = String::new();
    loop {
        if is_cancelled() {
            return Err(GeminiError::Cancelled);
        }
        line.clear();
        let bytes_read = reader
            .read_line(&mut line)
            .map_err(|err| GeminiError::Http(err.to_string()))?;
        if bytes_read == 0 {
            break;
        }
        let trimmed = line.trim_end_matches(['\r', '\n']);
        let Some(data) = trimmed.strip_prefix("data: ") else {
            continue;
        };
        if data == "[DONE]" {
            break;
        }
        for event in parse_sse_data(data)? {
            on_event(&event);
            events.push(event);
        }
    }
    Ok(events)
}
