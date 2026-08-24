//! Argument parsing and UI-action building for the three tools Gemini can
//! call: `pty_write`, `switch_tab`, `reveal_in_files`.

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::modules::error::AssistantError;

/// A UI-only tool result the WebView applies after confirm.
///
/// `pty_write` never produces one of these — it runs entirely in Rust.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct UiAction {
    pub name: String,
    pub args: Value,
}

#[derive(Deserialize)]
struct PtyWriteArgs {
    data: String,
}

#[derive(Deserialize)]
struct SwitchTabArgs {
    tab_id: String,
}

#[derive(Deserialize)]
struct RevealInFilesArgs {
    path: String,
}

#[derive(Deserialize)]
struct GitStageArgs {
    #[serde(default)]
    path: Option<String>,
    #[serde(default)]
    paths: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct GitCommitArgs {
    message: String,
}

#[derive(Deserialize)]
struct GitCreateBranchArgs {
    branch: String,
}

#[derive(Deserialize)]
struct GitStashArgs {
    #[serde(default)]
    message: Option<String>,
}

/// Extracts the `data` field from a `pty_write` tool call's `args_json`.
///
/// Any `session_id` key present is ignored (serde drops unknown fields by
/// default) — the active session always comes from the conversation's
/// latest snapshot, never from model-authored arguments.
pub(crate) fn parse_pty_write_data(args_json: &str) -> Result<String, AssistantError> {
    serde_json::from_str::<PtyWriteArgs>(args_json)
        .map(|args| args.data)
        .map_err(|_| AssistantError::InvalidArgs)
}

/// Builds the `ui_action` payload for `switch_tab`, `reveal_in_files`, or Git tools.
///
/// Returns [`AssistantError::InvalidArgs`] for any other `name`, or if the
/// known name's `args_json` is missing its required field.
pub(crate) fn build_ui_action(name: &str, args_json: &str) -> Result<UiAction, AssistantError> {
    match name {
        "switch_tab" => {
            let args: SwitchTabArgs =
                serde_json::from_str(args_json).map_err(|_| AssistantError::InvalidArgs)?;
            Ok(UiAction {
                name: name.to_string(),
                args: json!({ "tab_id": args.tab_id }),
            })
        }
        "reveal_in_files" => {
            let args: RevealInFilesArgs =
                serde_json::from_str(args_json).map_err(|_| AssistantError::InvalidArgs)?;
            Ok(UiAction {
                name: name.to_string(),
                args: json!({ "path": args.path }),
            })
        }
        "git_stage" => {
            let args: GitStageArgs =
                serde_json::from_str(args_json).map_err(|_| AssistantError::InvalidArgs)?;
            Ok(UiAction {
                name: name.to_string(),
                args: json!({ "path": args.path, "paths": args.paths }),
            })
        }
        "git_commit" => {
            let args: GitCommitArgs =
                serde_json::from_str(args_json).map_err(|_| AssistantError::InvalidArgs)?;
            Ok(UiAction {
                name: name.to_string(),
                args: json!({ "message": args.message }),
            })
        }
        "git_create_branch" => {
            let args: GitCreateBranchArgs =
                serde_json::from_str(args_json).map_err(|_| AssistantError::InvalidArgs)?;
            Ok(UiAction {
                name: name.to_string(),
                args: json!({ "branch": args.branch }),
            })
        }
        "git_stash" => {
            let args: GitStashArgs =
                serde_json::from_str(args_json).map_err(|_| AssistantError::InvalidArgs)?;
            Ok(UiAction {
                name: name.to_string(),
                args: json!({ "message": args.message }),
            })
        }
        _ => Err(AssistantError::InvalidArgs),
    }
}
