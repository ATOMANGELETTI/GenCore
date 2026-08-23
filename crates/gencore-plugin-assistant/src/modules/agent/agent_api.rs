//! Confirm/reject gate for tool calls proposed by Gemini, plus the turn loop
//! that drives a conversation through Gemini and back.
//!
//! Every tool call is `pending` until the user acts on it. Confirming runs
//! the tool; rejecting only ever flips the row's status. `send_turn` and
//! `resume_turn` never call either one — a `FunctionCall` from Gemini always
//! lands as a fresh `pending` row for a later `confirm_tool` / `reject_tool`
//! to resolve.

use std::sync::{Arc, Mutex};

use gencore_pty::SessionMap;
use serde_json::json;

use crate::modules::error::AssistantError;
use crate::modules::gemini::{
    GeminiContent, GeminiEvent, GeminiPart, GeminiRequest, GeminiTransport,
};
use crate::modules::secrets::{DEFAULT_MODEL, SecretProtector};
use crate::modules::store::{AssistantStore, Snapshot, ToolCall};
use crate::modules::tools::{UiAction, build_ui_action, parse_pty_write_data};

const GEMINI_API_KEY: &str = "gemini_api_key";
const NEW_CHAT_TITLE: &str = "New chat";
const TITLE_CHAR_LIMIT: usize = 48;

const SYSTEM_INSTRUCTIONS: &str = r"You are the GenCore Terminal assistant. Only call tools from the declared set (pty_write, switch_tab, reveal_in_files); propose one action and wait for the user to confirm or reject it before anything runs — you never run a tool or write to the pty yourself. Never claim a command ran unless a tool result says so. Never pass Windows \\?\ verbatim paths into PowerShell. Do not ask the user to paste or share their Gemini API key.";

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

/// Result of one [`send_turn`] / [`resume_turn`] call.
#[derive(Debug, Clone, PartialEq)]
pub struct TurnResult {
    pub assistant_text: String,
    pub pending: Vec<ToolCall>,
}

/// Sends `user_text` as a new user turn.
///
/// Persists the user message and `snapshot` (stamped with `conversation_id`
/// — the caller-supplied snapshot's own `conversation_id` is ignored), then
/// calls [`continue_turn`]. Kept for tests and other direct callers that
/// want a single persist-and-continue call.
///
/// `send_message`'s IPC command does **not** call this: it persists the
/// message/snapshot itself (synchronously, before returning
/// `{ accepted: true }`, so a persist failure surfaces on the command) and
/// calls [`continue_turn`] directly from its spawned background task —
/// calling `send_turn` there would insert the user message and snapshot a
/// second time.
pub fn send_turn(
    store: &AssistantStore,
    transport: &dyn GeminiTransport,
    protector: &dyn SecretProtector,
    conversation_id: &str,
    user_text: &str,
    snapshot: Snapshot,
) -> Result<TurnResult, AssistantError> {
    store.insert_message(conversation_id, "user", user_text)?;
    let mut snapshot = snapshot;
    snapshot.conversation_id = conversation_id.to_string();
    store.insert_snapshot(&snapshot)?;

    continue_turn(store, transport, protector, conversation_id, user_text)
}

/// Continues a turn whose user message and snapshot are already persisted.
///
/// Checks the API key, rewrites a still-default conversation title from
/// `user_text`, then calls `transport` once under the pending rule
/// described on [`run_turn`]. Never inserts the user message or a
/// snapshot, and never calls `confirm_tool`, `reject_tool`, or
/// `write_session` — the caller must have persisted the user turn already,
/// or Gemini's context (built from every persisted message in
/// [`build_request`]) would not include it.
pub fn continue_turn(
    store: &AssistantStore,
    transport: &dyn GeminiTransport,
    protector: &dyn SecretProtector,
    conversation_id: &str,
    user_text: &str,
) -> Result<TurnResult, AssistantError> {
    require_api_key(store, protector)?;
    rewrite_new_chat_title(store, conversation_id, user_text)?;

    let request = build_request(store, conversation_id)?;
    run_turn(store, transport, conversation_id, request)
}

/// Resumes a turn after `confirm_tool` / `reject_tool` resolved `tool_call_id`.
///
/// Loads that tool call's result (or rejection) as the latest tool result,
/// persists it as a `tool` message, then calls `transport` again under the
/// same pending rule as [`send_turn`].
pub fn resume_turn(
    store: &AssistantStore,
    transport: &dyn GeminiTransport,
    tool_call_id: &str,
) -> Result<TurnResult, AssistantError> {
    let call = store
        .get_tool_call(tool_call_id)?
        .ok_or(AssistantError::InvalidArgs)?;
    if call.status == "pending" {
        return Err(AssistantError::InvalidArgs);
    }

    let conversation_id = call.conversation_id.clone();
    store.insert_message(&conversation_id, "tool", &tool_result_text(&call))?;

    let request = build_request(store, &conversation_id)?;
    run_turn(store, transport, &conversation_id, request)
}

/// `NoApiKey` unless `gemini_api_key` is stored *and* still unprotects for
/// this user — a stale/corrupt DPAPI blob is treated the same as no key.
fn require_api_key(
    store: &AssistantStore,
    protector: &dyn SecretProtector,
) -> Result<(), AssistantError> {
    let Some(cipher) = store.get_secret(GEMINI_API_KEY)? else {
        return Err(AssistantError::NoApiKey);
    };
    protector
        .unprotect(&cipher)
        .map_err(|_| AssistantError::NoApiKey)?;
    Ok(())
}

/// Sets the conversation title to the first 48 chars of `user_text` if the
/// title is still the `"New chat"` default (or empty). Leaves any other
/// title untouched.
fn rewrite_new_chat_title(
    store: &AssistantStore,
    conversation_id: &str,
    user_text: &str,
) -> Result<(), AssistantError> {
    let Some(conversation) = store.get_conversation(conversation_id)? else {
        return Ok(());
    };
    if conversation.title != NEW_CHAT_TITLE && !conversation.title.is_empty() {
        return Ok(());
    }
    let title: String = user_text.chars().take(TITLE_CHAR_LIMIT).collect();
    store.set_conversation_title(conversation_id, &title)?;
    Ok(())
}

/// Builds the next [`GeminiRequest`]: the system prompt from [`build_system_prompt`],
/// `contents` from every persisted message in the conversation, and the
/// configured (or default) model.
fn build_request(
    store: &AssistantStore,
    conversation_id: &str,
) -> Result<GeminiRequest, AssistantError> {
    let system = build_system_prompt(store)?;
    let contents = store
        .list_messages(conversation_id)?
        .into_iter()
        .map(|message| GeminiContent {
            role: gemini_role(&message.role).to_string(),
            parts: vec![GeminiPart {
                text: message.content,
            }],
        })
        .collect();
    let model = store
        .get_setting("model")?
        .unwrap_or_else(|| DEFAULT_MODEL.to_string());
    GeminiRequest::new(&model, system, contents).map_err(|_| AssistantError::InvalidModel)
}

/// All `app_facts` plus the propose-and-confirm / no-`\\?\` / never-claim /
/// don't-ask-for-the-key instructions every turn sends to Gemini.
fn build_system_prompt(store: &AssistantStore) -> Result<String, AssistantError> {
    let facts = store.list_facts()?;
    let mut system = String::from("You are assisting inside GenCore Terminal.\n\nApp facts:\n");
    for (key, value) in facts {
        system.push_str("- ");
        system.push_str(&key);
        system.push_str(": ");
        system.push_str(&value);
        system.push('\n');
    }
    system.push('\n');
    system.push_str(SYSTEM_INSTRUCTIONS);
    Ok(system)
}

/// Gemini only knows `user` / `model` roles; a `tool` result message
/// surfaces to it as plain `user` text (no `functionResponse` part exists
/// in [`GeminiPart`] yet).
fn gemini_role(role: &str) -> &'static str {
    match role {
        "assistant" => "model",
        _ => "user",
    }
}

/// Renders a resolved tool call as the text of the `tool` message
/// `resume_turn` feeds back to Gemini.
fn tool_result_text(call: &ToolCall) -> String {
    match &call.result_json {
        Some(result_json) => format!(
            "Tool `{}` {} with result: {}",
            call.name, call.status, result_json
        ),
        None => format!("Tool `{}` was {} by the user.", call.name, call.status),
    }
}

/// Calls `transport.generate(request)` and applies the pending rule shared
/// by [`send_turn`] and [`resume_turn`]: the first `FunctionCall` stops the
/// turn immediately and becomes a `pending` tool_call (never executed here);
/// any `Text` seen up to that point is concatenated into the assistant
/// message, which is persisted either way.
fn run_turn(
    store: &AssistantStore,
    transport: &dyn GeminiTransport,
    conversation_id: &str,
    request: GeminiRequest,
) -> Result<TurnResult, AssistantError> {
    let events = transport
        .generate(request)
        .map_err(|err| AssistantError::Gemini(err.to_string()))?;

    let mut assistant_text = String::new();
    let mut function_call = None;
    for event in events {
        match event {
            GeminiEvent::Text(text) => assistant_text.push_str(&text),
            GeminiEvent::FunctionCall { name, args_json } => {
                function_call = Some((name, args_json));
                break;
            }
            GeminiEvent::Done => break,
        }
    }

    let message = store.insert_message(conversation_id, "assistant", &assistant_text)?;

    let pending = match function_call {
        Some((name, args_json)) => {
            let id =
                store.insert_tool_call(conversation_id, Some(&message.id), &name, &args_json)?;
            let call = store
                .get_tool_call(&id)?
                .ok_or(AssistantError::InvalidArgs)?;
            vec![call]
        }
        None => Vec::new(),
    };

    Ok(TurnResult {
        assistant_text,
        pending,
    })
}
