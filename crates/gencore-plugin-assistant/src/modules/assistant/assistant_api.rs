//! Tauri IPC commands for the Gemini assistant panel: conversations,
//! messages, turns, tool confirmation, and agent settings/API key storage.
//!
//! Every command opens a fresh [`AssistantStore`] connection inside
//! `tauri::async_runtime::spawn_blocking` — SQLite I/O never runs on an
//! async runtime worker thread. `send_message`, `confirm_action`, and
//! `reject_action` additionally hand the Gemini turn off to a detached
//! background task so the command itself returns as soon as the gate
//! (persist, or confirm/reject) succeeds; the network call and the
//! resulting `gencore-assistant://token` / `://turn` / `://error` events
//! happen after the command has already resolved. That background task
//! never holds the command's own store connection: it opens its own via
//! [`prepare_turn`] / [`prepare_resume`] + [`finish_turn`], dropping the
//! connection for the (up to 120s) HTTP call in between (Important 5).

use std::collections::HashSet;
use std::sync::{Arc, LazyLock, Mutex};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Runtime, State};

use gencore_pty::SessionMap;

use crate::modules::agent::{
    ConfirmOutcome, confirm_tool, finish_turn, prepare_resume, prepare_turn, reject_tool,
};
use crate::modules::error::AssistantError;
use crate::modules::gemini::{GeminiEvent, GeminiTransport, ReqwestTransport};
#[cfg(windows)]
use crate::modules::secrets::DpapiProtector;
#[cfg(not(windows))]
use crate::modules::secrets::IdentityProtector;
use crate::modules::secrets::{
    DEFAULT_CONTEXT_LINES, DEFAULT_MODEL, SecretProtector, clamp_context_lines, parse_model,
};
use crate::modules::store::{
    AssistantStore, Conversation, Message, Snapshot, StoreError, ToolCall, resolve_data_dir,
    sqlite_path,
};

/// `secrets` table key the stored (protected) Gemini API key lives under.
const GEMINI_API_KEY_SECRET: &str = "gemini_api_key";
/// `set_api_key` rejects anything longer than this with [`AssistantError::InvalidArgs`].
const API_KEY_MAX_LENGTH: usize = 4096;

pub const ASSISTANT_TOKEN_EVENT: &str = "gencore-assistant://token";
pub const ASSISTANT_TURN_EVENT: &str = "gencore-assistant://turn";
pub const ASSISTANT_ERROR_EVENT: &str = "gencore-assistant://error";
pub const ASSISTANT_UI_ACTION_EVENT: &str = "gencore-assistant://ui-action";

/// Kept for `deny_unknown_fields` testability; commands take these fields as
/// flattened parameters (see `session_api::OpenArgs` in `gencore-pty` for the
/// same pattern) and reconstruct one of these structs internally.
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ConversationIdArgs {
    pub conversation_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SendMessageArgs {
    pub conversation_id: String,
    pub text: String,
    pub snapshot: SnapshotArgs,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SnapshotArgs {
    pub active_tab_id: String,
    #[serde(default)]
    pub active_session_id: Option<String>,
    #[serde(default)]
    pub cwd: Option<String>,
    pub output_excerpt: String,
    pub tabs: Vec<SnapshotTabArgs>,
    #[serde(default)]
    pub files_selection: Option<FilesSelectionArgs>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SnapshotTabArgs {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub cwd: Option<String>,
    pub pinned: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FilesSelectionArgs {
    pub path: String,
    pub kind: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ActionIdArgs {
    pub id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SetAgentSettingsArgs {
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub context_lines: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SetApiKeyArgs {
    pub key: String,
}

/// Mirrors the assistant plugin's public agent settings; never carries the key.
#[derive(Debug, Clone, Serialize)]
pub struct AgentSettingsDto {
    pub model: String,
    pub context_lines: u32,
    pub has_api_key: bool,
}

/// Result of a successful `send_message` call. Accepted only means the
/// message was handed off; see the `token` / `turn` / `error` events for
/// what actually happened with Gemini.
#[derive(Debug, Clone, Serialize)]
pub struct SendMessageResult {
    pub accepted: bool,
}

/// Result of [`list_messages`]: every persisted message, plus any tool
/// calls still awaiting confirm/reject — the same shape a `turn` event
/// carries, so a conversation reloaded from SQLite (e.g. after an app
/// restart) hydrates its Approve/Reject ledger without a 13th command.
#[derive(Debug, Clone, Serialize)]
pub struct ListMessagesResult {
    pub messages: Vec<Message>,
    pub pending: Vec<ToolCall>,
}

/// Payload for [`ASSISTANT_TOKEN_EVENT`].
#[derive(Debug, Clone, Serialize)]
pub struct AssistantTokenPayload {
    pub conversation_id: String,
    pub text: String,
}

/// Payload for [`ASSISTANT_TURN_EVENT`].
#[derive(Debug, Clone, Serialize)]
pub struct AssistantTurnPayload {
    pub conversation_id: String,
    pub assistant_text: String,
    pub pending: Vec<ToolCall>,
}

/// Payload for [`ASSISTANT_ERROR_EVENT`]. `code` is the failing
/// [`AssistantError::code`] variant name (`NoApiKey`, `Gemini`,
/// `PtySessionGone`, …); `message` is `err.to_string()`. Neither field ever
/// carries key material.
#[derive(Debug, Clone, Serialize)]
pub struct AssistantErrorPayload {
    pub conversation_id: String,
    pub code: String,
    pub message: String,
}

/// Payload for [`ASSISTANT_UI_ACTION_EVENT`].
#[derive(Debug, Clone, Serialize)]
pub struct AssistantUiActionPayload {
    pub id: String,
    pub name: String,
    pub args: Value,
}

/// Conversation ids with a `cancel_turn` call pending consumption.
///
/// Set by `cancel_turn`. Polled (without clearing) by the transport's
/// `is_cancelled` hook while a stream is being read, and consumed once (via
/// [`take_cancelled`]) after `generate` returns, to suppress the `token` /
/// `turn` / `error` events a background task would otherwise emit for a
/// turn that was in fact cancelled.
static CANCELLED_TURNS: LazyLock<Mutex<HashSet<String>>> =
    LazyLock::new(|| Mutex::new(HashSet::new()));

fn mark_cancelled(conversation_id: &str) {
    if let Ok(mut cancelled) = CANCELLED_TURNS.lock() {
        cancelled.insert(conversation_id.to_string());
    }
}

/// Non-consuming check used as the transport's `is_cancelled` hook — called
/// repeatedly while a stream is being read, so it must not clear the flag
/// (that happens once, afterwards, via [`take_cancelled`]).
fn is_turn_cancelled(conversation_id: &str) -> bool {
    CANCELLED_TURNS
        .lock()
        .map(|cancelled| cancelled.contains(conversation_id))
        .unwrap_or(false)
}

/// Consumes a pending cancellation flag for `conversation_id`, if any.
fn take_cancelled(conversation_id: &str) -> bool {
    match CANCELLED_TURNS.lock() {
        Ok(mut cancelled) => cancelled.remove(conversation_id),
        Err(_) => false,
    }
}

#[cfg(windows)]
fn protector() -> DpapiProtector {
    DpapiProtector
}

#[cfg(not(windows))]
fn protector() -> IdentityProtector {
    IdentityProtector
}

/// Opens a fresh store connection at `sqlite_path(&resolve_data_dir(exe_parent))`.
///
/// Called fresh per command (never held across `.await`); schema
/// application is idempotent so repeated opens are cheap and safe.
fn open_store() -> Result<AssistantStore, AssistantError> {
    let exe = std::env::current_exe().map_err(|_| AssistantError::Store(StoreError::DataDir))?;
    let exe_parent = exe
        .parent()
        .ok_or(AssistantError::Store(StoreError::DataDir))?;
    let data_dir = resolve_data_dir(exe_parent);
    Ok(AssistantStore::open(&sqlite_path(&data_dir))?)
}

/// Loads and unprotects the stored Gemini API key.
fn load_api_key(store: &AssistantStore) -> Result<String, AssistantError> {
    let cipher = store
        .get_secret(GEMINI_API_KEY_SECRET)?
        .ok_or(AssistantError::NoApiKey)?;
    let plain = protector()
        .unprotect(&cipher)
        .map_err(|_| AssistantError::NoApiKey)?;
    String::from_utf8(plain).map_err(|_| AssistantError::NoApiKey)
}

fn current_agent_settings(store: &AssistantStore) -> Result<AgentSettingsDto, AssistantError> {
    let model = store
        .get_setting("model")?
        .unwrap_or_else(|| DEFAULT_MODEL.to_string());
    let context_lines = store
        .get_setting("context_lines")?
        .and_then(|value| value.parse::<i64>().ok())
        .and_then(clamp_context_lines)
        .unwrap_or(DEFAULT_CONTEXT_LINES);
    let has_api_key = store.has_secret(GEMINI_API_KEY_SECRET)?;
    Ok(AgentSettingsDto {
        model,
        context_lines,
        has_api_key,
    })
}

/// Runs `f` on the blocking thread pool, mapping a task panic/cancel into
/// [`AssistantError::TaskJoin`].
async fn run_blocking<T, F>(f: F) -> Result<T, AssistantError>
where
    F: FnOnce() -> Result<T, AssistantError> + Send + 'static,
    T: Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|err| AssistantError::TaskJoin(err.to_string()))?
}

/// Runs one Gemini turn to completion: opens a store, calls `prepare` for
/// the next [`crate::modules::gemini::GeminiRequest`], drops that store
/// connection, calls the real [`ReqwestTransport`] with no store reference
/// held (Important 5), then reopens a store for [`finish_turn`].
///
/// `prepare` returns the owning conversation id alongside the request — for
/// `send_message` that is always `conversation_id` unchanged; for
/// `confirm_action` / `reject_action` it is looked up from the tool call
/// being resumed. `on_event`/`is_cancelled` stream `://token` events and
/// poll [`is_turn_cancelled`] while the SSE body is read.
fn run_gemini_turn<R, P>(
    app: &AppHandle<R>,
    prepare: P,
) -> Result<crate::modules::agent::TurnResult, AssistantError>
where
    R: Runtime,
    P: FnOnce(
            &AssistantStore,
            &dyn SecretProtector,
        ) -> Result<(String, crate::modules::gemini::GeminiRequest), AssistantError>
        + Send
        + 'static,
{
    let store = open_store()?;
    let secret_protector = protector();
    let api_key = load_api_key(&store)?;
    let (conversation_id, request) = prepare(&store, &secret_protector)?;
    drop(store);

    let app_for_events = app.clone();
    let conversation_id_for_events = conversation_id.clone();
    let on_event = move |event: &GeminiEvent| {
        if let GeminiEvent::Text(text) = event {
            let _ = app_for_events.emit(
                ASSISTANT_TOKEN_EVENT,
                AssistantTokenPayload {
                    conversation_id: conversation_id_for_events.clone(),
                    text: text.clone(),
                },
            );
        }
    };
    let conversation_id_for_cancel = conversation_id.clone();
    let is_cancelled = move || is_turn_cancelled(&conversation_id_for_cancel);
    let transport = ReqwestTransport {
        api_key,
        on_event: &on_event,
        is_cancelled: &is_cancelled,
    };

    let events = transport.generate(request).map_err(map_gemini_error)?;

    let store = open_store()?;
    finish_turn(&store, &conversation_id, events)
}

fn map_gemini_error(err: crate::modules::gemini::GeminiError) -> AssistantError {
    match err {
        crate::modules::gemini::GeminiError::Cancelled => AssistantError::Cancelled,
        other => AssistantError::Gemini(other.to_string()),
    }
}

/// Emits `token` + `turn` on success, or `error` on failure — unless
/// `conversation_id` was cancelled (cooperative flag, or `turn` itself
/// resolved to [`AssistantError::Cancelled`]), in which case nothing is
/// emitted at all. Shared tail of every background turn task
/// (`send_message`, `confirm_action`, `reject_action`).
fn emit_turn_result<R: Runtime>(
    app: &AppHandle<R>,
    conversation_id: &str,
    turn: Result<crate::modules::agent::TurnResult, AssistantError>,
) {
    let was_cancelled = take_cancelled(conversation_id);
    if was_cancelled || matches!(turn, Err(AssistantError::Cancelled)) {
        return;
    }

    match turn {
        Ok(turn) => {
            let _ = app.emit(
                ASSISTANT_TOKEN_EVENT,
                AssistantTokenPayload {
                    conversation_id: conversation_id.to_string(),
                    text: turn.assistant_text.clone(),
                },
            );
            let _ = app.emit(
                ASSISTANT_TURN_EVENT,
                AssistantTurnPayload {
                    conversation_id: conversation_id.to_string(),
                    assistant_text: turn.assistant_text,
                    pending: turn.pending,
                },
            );
        }
        Err(err) => {
            let _ = app.emit(
                ASSISTANT_ERROR_EVENT,
                AssistantErrorPayload {
                    conversation_id: conversation_id.to_string(),
                    code: err.code().to_string(),
                    message: err.to_string(),
                },
            );
        }
    }
}

impl SnapshotArgs {
    /// Converts the IPC snapshot shape into the store's row shape, JSON-encoding
    /// `tabs` and `files_selection` exactly as read back by the agent turn loop.
    fn into_store_snapshot(self, conversation_id: &str) -> Result<Snapshot, AssistantError> {
        let tabs_json = serde_json::to_string(
            &self
                .tabs
                .into_iter()
                .map(|tab| {
                    serde_json::json!({
                        "id": tab.id,
                        "name": tab.name,
                        "cwd": tab.cwd,
                        "pinned": tab.pinned,
                    })
                })
                .collect::<Vec<_>>(),
        )
        .map_err(|_| AssistantError::InvalidArgs)?;

        let files_selection_json = self
            .files_selection
            .map(|selection| {
                serde_json::to_string(&serde_json::json!({
                    "path": selection.path,
                    "kind": selection.kind,
                }))
                .map_err(|_| AssistantError::InvalidArgs)
            })
            .transpose()?;

        Ok(Snapshot {
            id: String::new(),
            conversation_id: conversation_id.to_string(),
            message_id: None,
            cwd: self.cwd,
            active_session_id: self.active_session_id,
            active_tab_id: Some(self.active_tab_id),
            tabs_json,
            files_selection_json,
            output_excerpt: self.output_excerpt,
            created_at: 0,
        })
    }
}

/// Lists every conversation, most recently updated first.
#[tauri::command]
pub async fn list_conversations() -> Result<Vec<Conversation>, AssistantError> {
    run_blocking(|| Ok(open_store()?.list_conversations()?)).await
}

/// Creates a new, empty conversation titled `"New chat"`.
#[tauri::command]
pub async fn create_conversation() -> Result<Conversation, AssistantError> {
    run_blocking(|| Ok(open_store()?.create_conversation()?)).await
}

/// Deletes a conversation and every message/tool call/snapshot under it.
#[tauri::command(rename_all = "snake_case")]
pub async fn delete_conversation(conversation_id: String) -> Result<(), AssistantError> {
    let args = ConversationIdArgs { conversation_id };
    run_blocking(move || Ok(open_store()?.delete_conversation(&args.conversation_id)?)).await
}

/// Lists every message in a conversation, oldest first, plus any tool calls
/// still `pending` — see [`ListMessagesResult`].
#[tauri::command(rename_all = "snake_case")]
pub async fn list_messages(conversation_id: String) -> Result<ListMessagesResult, AssistantError> {
    let args = ConversationIdArgs { conversation_id };
    run_blocking(move || {
        let store = open_store()?;
        let messages = store.list_messages(&args.conversation_id)?;
        let pending = store.list_pending_tool_calls(&args.conversation_id)?;
        Ok(ListMessagesResult { messages, pending })
    })
    .await
}

/// Persists the user's message and snapshot, then hands the Gemini turn to
/// a background task and returns `{ accepted: true }` without waiting for
/// it.
///
/// Persist happens synchronously, on the blocking pool, *before* this
/// command returns — an unknown `conversation_id` or a store error fails
/// the command itself (`Err`), never a later-only event. The background
/// task then calls [`run_gemini_turn`] with [`prepare_turn`], which checks
/// the API key, rewrites the title, and calls Gemini; it never re-inserts
/// the message/snapshot this command already persisted. It emits
/// `token` / `turn` / `error` via [`emit_turn_result`] — unless
/// `cancel_turn` marked this conversation cancelled first.
#[tauri::command(rename_all = "snake_case")]
pub async fn send_message<R: Runtime>(
    app: AppHandle<R>,
    conversation_id: String,
    text: String,
    snapshot: SnapshotArgs,
) -> Result<SendMessageResult, AssistantError> {
    let args = SendMessageArgs {
        conversation_id,
        text,
        snapshot,
    };
    let store_snapshot = args.snapshot.into_store_snapshot(&args.conversation_id)?;
    let conversation_id = args.conversation_id;
    let text = args.text;

    let conversation_id_for_persist = conversation_id.clone();
    let text_for_persist = text.clone();
    run_blocking(move || {
        let store = open_store()?;
        store.insert_user_turn(
            &conversation_id_for_persist,
            &text_for_persist,
            store_snapshot,
        )?;
        Ok(())
    })
    .await?;

    tauri::async_runtime::spawn(async move {
        let turn = run_blocking({
            let app = app.clone();
            let conversation_id = conversation_id.clone();
            move || {
                run_gemini_turn(&app, move |store, protector| {
                    let request = prepare_turn(store, protector, &conversation_id, &text)?;
                    Ok((conversation_id.clone(), request))
                })
            }
        })
        .await;

        emit_turn_result(&app, &conversation_id, turn);
    });

    Ok(SendMessageResult { accepted: true })
}

/// Marks `conversation_id`'s in-flight turn cancelled; see [`CANCELLED_TURNS`].
#[tauri::command(rename_all = "snake_case")]
pub async fn cancel_turn(conversation_id: String) -> Result<(), AssistantError> {
    mark_cancelled(&conversation_id);
    Ok(())
}

/// Approves a pending tool call, runs it, then (once the gate itself
/// succeeds) resumes the Gemini turn in a detached background task —
/// mirroring [`send_message`]'s split so the command returns without
/// waiting on the Gemini round trip. Emits `ui-action` when the resolved
/// tool was a UI-only action (`switch_tab` / `reveal_in_files`), always
/// *before* the resume task is spawned.
///
/// A failed gate (not pending, `PtySessionGone`, …) fails the command
/// itself and never spawns a resume task.
#[tauri::command]
pub async fn confirm_action<R: Runtime>(
    app: AppHandle<R>,
    pty_sessions: State<'_, Arc<Mutex<SessionMap>>>,
    id: String,
) -> Result<ConfirmOutcome, AssistantError> {
    let pty_sessions = Arc::clone(pty_sessions.inner());
    let args = ActionIdArgs { id };
    let action_id = args.id.clone();
    let (outcome, conversation_id) = run_blocking(move || {
        let store = open_store()?;
        let conversation_id = store
            .get_tool_call(&args.id)?
            .ok_or(AssistantError::ActionNotPending)?
            .conversation_id;
        let outcome = confirm_tool(&store, &args.id, Some(&pty_sessions))?;
        Ok((outcome, conversation_id))
    })
    .await?;

    if let Some(ui_action) = &outcome.ui_action {
        let _ = app.emit(
            ASSISTANT_UI_ACTION_EVENT,
            AssistantUiActionPayload {
                id: action_id.clone(),
                name: ui_action.name.clone(),
                args: ui_action.args.clone(),
            },
        );
    }

    spawn_resume_turn(app, conversation_id, action_id);

    Ok(outcome)
}

/// Rejects a pending tool call, then (once the gate succeeds) resumes the
/// Gemini turn in a detached background task, exactly like
/// [`confirm_action`]. Never touches the pty or emits a `ui-action` event.
#[tauri::command]
pub async fn reject_action<R: Runtime>(
    app: AppHandle<R>,
    id: String,
) -> Result<(), AssistantError> {
    let args = ActionIdArgs { id };
    let action_id = args.id.clone();
    let conversation_id = run_blocking(move || {
        let store = open_store()?;
        let conversation_id = store
            .get_tool_call(&args.id)?
            .ok_or(AssistantError::ActionNotPending)?
            .conversation_id;
        reject_tool(&store, &args.id)?;
        Ok(conversation_id)
    })
    .await?;

    spawn_resume_turn(app, conversation_id, action_id);

    Ok(())
}

/// Spawns the background task that resumes Gemini after a tool call was
/// just confirmed or rejected — mirrors [`send_message`]'s spawn, using
/// [`prepare_resume`] instead of [`prepare_turn`]. `conversation_id` is
/// already known from the gate that just ran, so a `NoApiKey` (or any
/// other) failure inside the task can still be attributed to the right
/// conversation and reach the ledger via [`emit_turn_result`].
fn spawn_resume_turn<R: Runtime>(app: AppHandle<R>, conversation_id: String, tool_call_id: String) {
    tauri::async_runtime::spawn(async move {
        let turn = run_blocking({
            let app = app.clone();
            move || {
                run_gemini_turn(&app, move |store, protector| {
                    prepare_resume(store, protector, &tool_call_id)
                })
            }
        })
        .await;

        emit_turn_result(&app, &conversation_id, turn);
    });
}

/// Returns the current model, context-line budget, and whether a key is stored.
#[tauri::command]
pub async fn get_agent_settings() -> Result<AgentSettingsDto, AssistantError> {
    run_blocking(|| current_agent_settings(&open_store()?)).await
}

/// Applies a partial settings patch, then returns the resulting settings.
#[tauri::command(rename_all = "snake_case")]
pub async fn set_agent_settings(
    model: Option<String>,
    context_lines: Option<u32>,
) -> Result<AgentSettingsDto, AssistantError> {
    let args = SetAgentSettingsArgs {
        model,
        context_lines,
    };
    run_blocking(move || {
        let store = open_store()?;
        if let Some(model) = &args.model {
            let allowed = parse_model(model)?;
            store.set_setting("model", allowed)?;
        }
        if let Some(context_lines) = args.context_lines {
            let clamped =
                clamp_context_lines(i64::from(context_lines)).ok_or(AssistantError::InvalidArgs)?;
            store.set_setting("context_lines", &clamped.to_string())?;
        }
        current_agent_settings(&store)
    })
    .await
}

/// Protects `key` with the platform secret protector, then stores it.
/// Rejects an empty or oversized key before touching the store.
#[tauri::command]
pub async fn set_api_key(key: String) -> Result<(), AssistantError> {
    let args = SetApiKeyArgs { key };
    if args.key.is_empty() || args.key.len() > API_KEY_MAX_LENGTH {
        return Err(AssistantError::InvalidArgs);
    }
    run_blocking(move || {
        let store = open_store()?;
        let protected = protector().protect(args.key.as_bytes())?;
        store.put_secret(GEMINI_API_KEY_SECRET, &protected)?;
        Ok(())
    })
    .await
}

/// Deletes the stored Gemini API key, if any.
#[tauri::command]
pub async fn clear_api_key() -> Result<(), AssistantError> {
    run_blocking(|| Ok(open_store()?.clear_secret(GEMINI_API_KEY_SECRET)?)).await
}
