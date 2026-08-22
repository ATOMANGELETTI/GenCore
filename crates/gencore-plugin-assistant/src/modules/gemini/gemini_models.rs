use serde::Serialize;
use serde_json::{Value, json};

use crate::modules::secrets::parse_model;

use super::gemini_error::GeminiError;

/// One request payload for the Gemini Developer API streaming `generateContent` call.
#[derive(Debug, Clone, Serialize)]
pub struct GeminiRequest {
    pub model: String,
    pub system: String,
    pub contents: Vec<GeminiContent>,
    pub tools: Value,
}

/// One turn of conversation history sent to Gemini.
#[derive(Debug, Clone, Serialize)]
pub struct GeminiContent {
    pub role: String,
    pub parts: Vec<GeminiPart>,
}

/// One part of a [`GeminiContent`] turn. Only text parts are sent upstream.
#[derive(Debug, Clone, Serialize)]
pub struct GeminiPart {
    pub text: String,
}

impl GeminiRequest {
    /// Builds a request for `model`, rejecting anything outside the Config
    /// allowlist via [`parse_model`]. `tools` is always [`function_declarations`].
    pub fn new(
        model: &str,
        system: impl Into<String>,
        contents: Vec<GeminiContent>,
    ) -> Result<Self, GeminiError> {
        let model = parse_model(model).map_err(|_| GeminiError::InvalidModel)?;
        Ok(Self {
            model: model.to_string(),
            system: system.into(),
            contents,
            tools: function_declarations(),
        })
    }
}

/// The `tools` array offered to Gemini: `pty_write`, `switch_tab`, and
/// `reveal_in_files`. None of these declarations expose `session_id` — the
/// active PTY session is chosen by the app, never by the model.
pub fn function_declarations() -> Value {
    json!([
        {
            "functionDeclarations": [
                {
                    "name": "pty_write",
                    "description": "Writes data to the active terminal PTY. The user must confirm before this runs.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "data": { "type": "string" }
                        },
                        "required": ["data"]
                    }
                },
                {
                    "name": "switch_tab",
                    "description": "Switches the active terminal tab.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "tab_id": { "type": "string" }
                        },
                        "required": ["tab_id"]
                    }
                },
                {
                    "name": "reveal_in_files",
                    "description": "Reveals a path in the Files tab.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": { "type": "string" }
                        },
                        "required": ["path"]
                    }
                }
            ]
        }
    ])
}
