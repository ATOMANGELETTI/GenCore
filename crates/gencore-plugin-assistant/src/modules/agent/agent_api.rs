//! Confirm/reject gate for tool calls proposed by Gemini, plus the turn loop
//! that drives a conversation through Gemini and back.
//!
//! Every tool call is `pending` until the user acts on it. Confirming runs
//! the tool; rejecting only ever flips the row's status. Once a call is
//! resolved, the IPC layer resumes the Gemini turn (see [`resume_turn`]) so
//! the model learns what happened and can continue.
//!
//! The turn loop is split into three phases so the IPC layer can avoid
//! holding a SQLite connection across the (up to 120s) Gemini HTTP call:
//! [`prepare_turn`] / [`prepare_resume`] build the next [`GeminiRequest`]
//! with the store open, [`GeminiTransport::generate`] runs with no store
//! reference at all, and [`finish_turn`] reopens the store to persist the
//! result. [`continue_turn`] / [`resume_turn`] compose all three phases
//! against a single caller-supplied `store` — convenient for tests and any
//! caller that does not need the split (a `ScriptedTransport` call never
//! blocks long enough to matter).

use std::sync::{Arc, Mutex};

use gencore_pty::SessionMap;
use serde_json::{Value, json};

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

const SYSTEM_INSTRUCTIONS: &str = r"You are the GenCore Terminal assistant. Only call tools from the declared set (pty_write, switch_tab, reveal_in_files, git_stage, git_commit, git_create_branch, git_stash); propose one action and wait for the user to confirm or reject it before anything runs — you never run a tool or write to the pty yourself. Never claim a command ran unless a tool result says so. Never pass Windows \\?\ verbatim paths into PowerShell. Do not ask the user to paste or share their Gemini API key.";

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
        "switch_tab" | "reveal_in_files" | "git_stage" | "git_commit" | "git_create_branch"
        | "git_stash" => confirm_ui_action(store, &call),
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
/// Persists the user message and `snapshot` in one transaction via
/// [`AssistantStore::insert_user_turn`] (the caller-supplied snapshot's own
/// `conversation_id` is ignored — it is always stamped with
/// `conversation_id`), then calls [`continue_turn`]. Kept for tests and
/// other direct callers that want a single persist-and-continue call.
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
    let mut snapshot = snapshot;
    snapshot.conversation_id = conversation_id.to_string();
    store.insert_user_turn(conversation_id, user_text, snapshot)?;

    continue_turn(store, transport, protector, conversation_id, user_text)
}

/// Continues a turn whose user message and snapshot are already persisted.
///
/// Composes [`prepare_turn`], `transport.generate`, and [`finish_turn`]
/// against the same `store` reference. Never inserts the user message or a
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
    let request = prepare_turn(store, protector, conversation_id, user_text)?;
    let events = transport.generate(request).map_err(map_gemini_error)?;
    finish_turn(store, conversation_id, events)
}

/// Resumes a turn after `confirm_tool` / `reject_tool` resolved `tool_call_id`.
///
/// Composes [`prepare_resume`], `transport.generate`, and [`finish_turn`]
/// against the same `store` reference — see [`prepare_resume`] for what it
/// persists before calling the transport.
pub fn resume_turn(
    store: &AssistantStore,
    transport: &dyn GeminiTransport,
    protector: &dyn SecretProtector,
    tool_call_id: &str,
) -> Result<TurnResult, AssistantError> {
    let (conversation_id, request) = prepare_resume(store, protector, tool_call_id)?;
    let events = transport.generate(request).map_err(map_gemini_error)?;
    finish_turn(store, &conversation_id, events)
}

/// Builds the next [`GeminiRequest`] for [`continue_turn`] without calling
/// the transport: checks the API key, rewrites a still-default title from
/// `user_text`, then builds the request from every persisted message plus
/// the latest snapshot.
///
/// The IPC layer calls this, drops its `AssistantStore`, calls
/// `transport.generate` with no store reference held, then reopens a store
/// for [`finish_turn`] — see the module docs.
pub fn prepare_turn(
    store: &AssistantStore,
    protector: &dyn SecretProtector,
    conversation_id: &str,
    user_text: &str,
) -> Result<GeminiRequest, AssistantError> {
    require_api_key(store, protector)?;
    rewrite_new_chat_title(store, conversation_id, user_text)?;
    build_request(store, conversation_id)
}

/// Builds the next [`GeminiRequest`] for [`resume_turn`] without calling the
/// transport: checks the API key, persists the resolved tool call's result
/// as a `tool` role message (for the ledger; Gemini gets a `functionResponse`
/// part from [`build_request`] instead, never this flattened text), then
/// builds the request. Returns the owning conversation id alongside it.
pub fn prepare_resume(
    store: &AssistantStore,
    protector: &dyn SecretProtector,
    tool_call_id: &str,
) -> Result<(String, GeminiRequest), AssistantError> {
    require_api_key(store, protector)?;

    let call = store
        .get_tool_call(tool_call_id)?
        .ok_or(AssistantError::InvalidArgs)?;
    if call.status == "pending" {
        return Err(AssistantError::InvalidArgs);
    }

    let conversation_id = call.conversation_id.clone();
    store.insert_message(&conversation_id, "tool", &tool_result_text(&call))?;

    let request = build_request(store, &conversation_id)?;
    Ok((conversation_id, request))
}

/// Applies the pending rule to `events` and persists the result: the first
/// `FunctionCall` stops the turn immediately and becomes a `pending`
/// tool_call (never executed here); any `Text` seen up to that point is
/// concatenated into the assistant message, which is persisted either way.
///
/// Callers must not call this after a cancelled `transport.generate` — a
/// cancelled turn returns before `finish_turn` is ever reached, so no
/// assistant message or pending row is written for it.
pub fn finish_turn(
    store: &AssistantStore,
    conversation_id: &str,
    events: Vec<GeminiEvent>,
) -> Result<TurnResult, AssistantError> {
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

/// Builds the next [`GeminiRequest`]: the system prompt from
/// [`build_system_prompt`] (app facts + current snapshot + instructions),
/// `contents` from every persisted message in the conversation, and the
/// configured (or default) model.
///
/// `tool` role messages are never mapped to their own `GeminiContent` —
/// they exist only for the ledger. Instead, each `assistant` message's
/// linked tool_calls are rebuilt as official Gemini `functionCall` /
/// `functionResponse` parts (see [`function_call_parts`]).
fn build_request(
    store: &AssistantStore,
    conversation_id: &str,
) -> Result<GeminiRequest, AssistantError> {
    let system = build_system_prompt(store, conversation_id)?;
    let mut contents = Vec::new();
    for message in store.list_messages(conversation_id)? {
        match message.role.as_str() {
            "tool" => continue,
            "assistant" => {
                let tool_calls = store.list_tool_calls_for_message(&message.id)?;
                let mut parts = Vec::new();
                if !message.content.is_empty() {
                    parts.push(GeminiPart::text(&message.content));
                }
                for call in &tool_calls {
                    parts.push(GeminiPart::function_call(
                        &call.name,
                        function_call_args(call),
                    ));
                }
                if !parts.is_empty() {
                    contents.push(GeminiContent {
                        role: "model".to_string(),
                        parts,
                    });
                }
                for call in &tool_calls {
                    if call.status == "pending" {
                        continue;
                    }
                    contents.push(GeminiContent {
                        role: "user".to_string(),
                        parts: vec![GeminiPart::function_response(
                            &call.name,
                            function_response_value(call),
                        )],
                    });
                }
            }
            role => {
                contents.push(GeminiContent {
                    role: gemini_role(role).to_string(),
                    parts: vec![GeminiPart::text(&message.content)],
                });
            }
        }
    }
    let model = store
        .get_setting("model")?
        .unwrap_or_else(|| DEFAULT_MODEL.to_string());
    GeminiRequest::new(&model, system, contents).map_err(|_| AssistantError::InvalidModel)
}

/// `call.args_json` re-parsed as a JSON object with any `session_id` key
/// dropped — the model was never offered that field (see
/// `function_declarations`) and must not see it echoed back either.
fn function_call_args(call: &ToolCall) -> Value {
    let mut args: Value = serde_json::from_str(&call.args_json).unwrap_or(Value::Null);
    if let Value::Object(map) = &mut args {
        map.remove("session_id");
    }
    args
}

/// The `functionResponse.response` value for a resolved tool call: its
/// status plus the parsed `result_json`, if any (rejection/failure rows have
/// none).
fn function_response_value(call: &ToolCall) -> Value {
    match call
        .result_json
        .as_deref()
        .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
    {
        Some(result) => json!({ "status": call.status, "result": result }),
        None => json!({ "status": call.status }),
    }
}

/// All `app_facts`, the current snapshot (or an explicit "none yet" note so
/// the model does not invent tabs/output), and the propose-and-confirm /
/// no-`\\?\` / never-claim / don't-ask-for-the-key instructions every turn
/// sends to Gemini.
fn build_system_prompt(
    store: &AssistantStore,
    conversation_id: &str,
) -> Result<String, AssistantError> {
    let facts = store.list_facts()?;
    let mut system = String::from("You are assisting inside GenCore Terminal.\n\nApp facts:\n");
    for (key, value) in facts {
        system.push_str("- ");
        system.push_str(&key);
        system.push_str(": ");
        system.push_str(&value);
        system.push('\n');
    }

    system.push_str("\nCurrent snapshot:\n");
    match store.latest_snapshot(conversation_id)? {
        Some(snapshot) => {
            system.push_str("- cwd: ");
            system.push_str(snapshot.cwd.as_deref().unwrap_or("(unknown)"));
            system.push('\n');
            system.push_str("- active_tab_id: ");
            system.push_str(snapshot.active_tab_id.as_deref().unwrap_or("(none)"));
            system.push('\n');
            if let Some(active_session_id) = &snapshot.active_session_id {
                system.push_str("- active_session_id: ");
                system.push_str(active_session_id);
                system.push('\n');
            }
            system.push_str("- tabs: ");
            system.push_str(&snapshot.tabs_json);
            system.push('\n');
            if let Some(files_selection) = &snapshot.files_selection_json {
                system.push_str("- files_selection: ");
                system.push_str(files_selection);
                system.push('\n');
            }
            system.push_str("- output_excerpt: ");
            system.push_str(&snapshot.output_excerpt);
            system.push('\n');
        }
        None => {
            system.push_str(
                "- no snapshot is available yet; do not assume any tabs, cwd, or output exist.\n",
            );
        }
    }

    system.push('\n');
    system.push_str(SYSTEM_INSTRUCTIONS);
    Ok(system)
}

/// Gemini only knows `user` / `model` roles; a `tool` result message never
/// reaches this — [`build_request`] skips `tool` rows and sends the
/// resolved call as a `functionResponse` part instead.
fn gemini_role(role: &str) -> &'static str {
    match role {
        "assistant" => "model",
        _ => "user",
    }
}

/// Renders a resolved tool call as the text of the `tool` message
/// `prepare_resume` feeds the ledger. Never sent to Gemini as text — see
/// [`build_request`].
fn tool_result_text(call: &ToolCall) -> String {
    match &call.result_json {
        Some(result_json) => format!(
            "Tool `{}` {} with result: {}",
            call.name, call.status, result_json
        ),
        None => format!("Tool `{}` was {} by the user.", call.name, call.status),
    }
}

/// Maps a transport-level [`crate::modules::gemini::GeminiError`] to the
/// crate-wide [`AssistantError`], preserving cancellation as its own variant
/// so callers can tell "Gemini failed" apart from "the user cancelled" —
/// [`finish_turn`] must never run for the latter.
fn map_gemini_error(err: crate::modules::gemini::GeminiError) -> AssistantError {
    match err {
        crate::modules::gemini::GeminiError::Cancelled => AssistantError::Cancelled,
        other => AssistantError::Gemini(other.to_string()),
    }
}
