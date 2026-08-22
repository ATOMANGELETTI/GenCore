//! Confirm/reject gate for tool calls proposed by Gemini.
//!
//! Every tool call is `pending` until the user acts on it. Confirming runs
//! the tool; rejecting only ever flips the row's status.

use std::sync::{Arc, Mutex};

use gencore_pty::SessionMap;
use serde_json::json;

use crate::modules::error::AssistantError;
use crate::modules::store::{AssistantStore, ToolCall};
use crate::modules::tools::{UiAction, build_ui_action, parse_pty_write_data};

/// Result of a tool call that ran (or was applied by the UI) after confirm.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct ConfirmOutcome {
    pub name: String,
    pub result_json: String,
    pub ui_action: Option<UiAction>,
}

/// Approves a pending tool call and runs it.
///
/// `pty` supplies the live session map for `pty_write`; pass `None` when no
/// pty backend is available. The active session id always comes from the
/// conversation's latest snapshot — never from Gemini's `args_json` — so a
/// forged `session_id` argument cannot redirect a write.
pub fn confirm_tool(
    store: &AssistantStore,
    id: &str,
    pty: Option<&Arc<Mutex<SessionMap>>>,
) -> Result<ConfirmOutcome, AssistantError> {
    let call = load_pending(store, id)?;
    store.set_tool_status(id, "approved", None)?;

    match call.name.as_str() {
        "pty_write" => confirm_pty_write(store, &call, pty),
        "switch_tab" | "reveal_in_files" => confirm_ui_action(store, &call),
        _ => fail(store, &call, AssistantError::InvalidArgs),
    }
}

/// Rejects a pending tool call. Never touches the pty.
pub fn reject_tool(store: &AssistantStore, id: &str) -> Result<(), AssistantError> {
    load_pending(store, id)?;
    store.set_tool_status(id, "rejected", None)?;
    Ok(())
}

/// Loads `id`, failing with [`AssistantError::ActionNotPending`] unless the
/// row exists and its status is still `pending`.
fn load_pending(store: &AssistantStore, id: &str) -> Result<ToolCall, AssistantError> {
    match store.get_tool_call(id)? {
        Some(call) if call.status == "pending" => Ok(call),
        _ => Err(AssistantError::ActionNotPending),
    }
}

fn confirm_pty_write(
    store: &AssistantStore,
    call: &ToolCall,
    pty: Option<&Arc<Mutex<SessionMap>>>,
) -> Result<ConfirmOutcome, AssistantError> {
    let session_id = store
        .latest_snapshot(&call.conversation_id)?
        .and_then(|snapshot| snapshot.active_session_id)
        .filter(|session_id| !session_id.is_empty());

    let Some(session_id) = session_id else {
        return fail(store, call, AssistantError::PtySessionGone);
    };

    let data = match parse_pty_write_data(&call.args_json) {
        Ok(data) => data,
        Err(err) => return fail(store, call, err),
    };

    let Some(map) = pty else {
        return fail(store, call, AssistantError::PtySessionGone);
    };

    match gencore_pty::write_session(map, &session_id, &data) {
        Ok(()) => {
            let result_json = json!({ "ok": true }).to_string();
            store.set_tool_status(&call.id, "ran", Some(&result_json))?;
            Ok(ConfirmOutcome {
                name: call.name.clone(),
                result_json,
                ui_action: None,
            })
        }
        Err(err) => fail(store, call, AssistantError::from(err)),
    }
}

fn confirm_ui_action(
    store: &AssistantStore,
    call: &ToolCall,
) -> Result<ConfirmOutcome, AssistantError> {
    let ui_action = match build_ui_action(&call.name, &call.args_json) {
        Ok(ui_action) => ui_action,
        Err(err) => return fail(store, call, err),
    };

    let result_json = json!({ "ok": true }).to_string();
    store.set_tool_status(&call.id, "ran", Some(&result_json))?;
    Ok(ConfirmOutcome {
        name: call.name.clone(),
        result_json,
        ui_action: Some(ui_action),
    })
}

/// Marks `call` `failed` with `err`'s message recorded as `result_json`,
/// then returns `err` unchanged.
fn fail(
    store: &AssistantStore,
    call: &ToolCall,
    err: AssistantError,
) -> Result<ConfirmOutcome, AssistantError> {
    let result_json = json!({ "error": err.to_string() }).to_string();
    store.set_tool_status(&call.id, "failed", Some(&result_json))?;
    Err(err)
}
