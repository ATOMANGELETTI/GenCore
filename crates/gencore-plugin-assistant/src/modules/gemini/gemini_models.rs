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

/// One part of a [`GeminiContent`] turn: text, a model `functionCall`, or a
/// `functionResponse` — exactly one field is ever `Some`. Constructed via
/// [`GeminiPart::text`], [`GeminiPart::function_call`], or
/// [`GeminiPart::function_response`], never by setting fields directly.
#[derive(Debug, Clone, Serialize)]
pub struct GeminiPart {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(rename = "functionCall", skip_serializing_if = "Option::is_none")]
    pub function_call: Option<GeminiFunctionCall>,
    #[serde(rename = "functionResponse", skip_serializing_if = "Option::is_none")]
    pub function_response: Option<GeminiFunctionResponse>,
}

/// A model turn's tool call, replayed from a persisted [`crate::modules::store::ToolCall`]
/// so a resumed conversation resends Gemini's own shape instead of paraphrased text.
#[derive(Debug, Clone, Serialize)]
pub struct GeminiFunctionCall {
    pub name: String,
    pub args: Value,
}

/// The user-turn reply to a [`GeminiFunctionCall`]: the tool's resolved
/// result (or rejection), addressed back to Gemini by function `name`.
#[derive(Debug, Clone, Serialize)]
pub struct GeminiFunctionResponse {
    pub name: String,
    pub response: Value,
}

impl GeminiPart {
    pub fn text(text: impl Into<String>) -> Self {
        Self {
            text: Some(text.into()),
            function_call: None,
            function_response: None,
        }
    }

    pub fn function_call(name: impl Into<String>, args: Value) -> Self {
        Self {
            text: None,
            function_call: Some(GeminiFunctionCall {
                name: name.into(),
                args,
            }),
            function_response: None,
        }
    }

    pub fn function_response(name: impl Into<String>, response: Value) -> Self {
        Self {
            text: None,
            function_call: None,
            function_response: Some(GeminiFunctionResponse {
                name: name.into(),
                response,
            }),
        }
    }
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
                },
                {
                    "name": "git_stage",
                    "description": "Stages files for commit in the active git repository. The user must confirm before this runs.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": { "type": "string" },
                            "paths": {
                                "type": "array",
                                "items": { "type": "string" }
                            }
                        }
                    }
                },
                {
                    "name": "git_commit",
                    "description": "Commits staged changes in the active git repository. The user must confirm before this runs.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "message": { "type": "string" }
                        },
                        "required": ["message"]
                    }
                },
                {
                    "name": "git_create_branch",
                    "description": "Creates and checks out a new git branch in the active repository. The user must confirm before this runs.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "branch": { "type": "string" }
                        },
                        "required": ["branch"]
                    }
                },
                {
                    "name": "git_stash",
                    "description": "Stashes current working changes in the active git repository. The user must confirm before this runs.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "message": { "type": "string" }
                        }
                    }
                }
            ]
        }
    ])
}
