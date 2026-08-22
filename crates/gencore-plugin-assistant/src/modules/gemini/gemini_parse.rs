use serde::Deserialize;
use serde_json::Value;

use super::gemini_error::GeminiError;

/// One event decoded from a single Gemini SSE `data:` payload.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GeminiEvent {
    /// A streamed text delta from the model.
    Text(String),
    /// A tool call the model wants to run. `args_json` is the raw JSON object
    /// Gemini sent for `args`, serialized back to a string; it never contains
    /// fields the model was not offered (e.g. `session_id`).
    FunctionCall { name: String, args_json: String },
    /// The candidate reported a finish reason; the turn is complete.
    Done,
}

#[derive(Debug, Deserialize)]
struct SseData {
    #[serde(default)]
    candidates: Vec<SseCandidate>,
}

#[derive(Debug, Deserialize)]
struct SseCandidate {
    #[serde(default)]
    content: Option<SseContent>,
    #[serde(default, rename = "finishReason")]
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SseContent {
    #[serde(default)]
    parts: Vec<SsePart>,
}

#[derive(Debug, Deserialize)]
struct SsePart {
    #[serde(default)]
    text: Option<String>,
    #[serde(default, rename = "functionCall")]
    function_call: Option<SseFunctionCall>,
}

#[derive(Debug, Deserialize)]
struct SseFunctionCall {
    name: String,
    #[serde(default)]
    args: Value,
}

/// Parses one Gemini SSE `data:` payload — a single JSON object string, not a
/// full `data: ...\n\n` stream — into zero or more [`GeminiEvent`]s.
pub fn parse_sse_data(data: &str) -> Result<Vec<GeminiEvent>, GeminiError> {
    let parsed: SseData = serde_json::from_str(data).map_err(|_| GeminiError::InvalidPayload)?;
    let mut events = Vec::new();
    for candidate in parsed.candidates {
        if let Some(content) = candidate.content {
            for part in content.parts {
                if let Some(text) = part.text {
                    events.push(GeminiEvent::Text(text));
                }
                if let Some(call) = part.function_call {
                    events.push(GeminiEvent::FunctionCall {
                        name: call.name,
                        args_json: call.args.to_string(),
                    });
                }
            }
        }
        if candidate.finish_reason.is_some() {
            events.push(GeminiEvent::Done);
        }
    }
    Ok(events)
}
