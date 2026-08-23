use std::cell::RefCell;
use std::sync::{Arc, Mutex};

use gencore_assistant::{
    AssistantError, AssistantStore, GeminiError, GeminiEvent, GeminiRequest, GeminiTransport,
    IdentityProtector, ScriptedTransport, SecretProtector, Snapshot, confirm_tool, continue_turn,
    finish_turn, prepare_resume, prepare_turn, reject_tool, resume_turn, seed_app_facts, send_turn,
};
use gencore_pty::SessionMap;
use std::sync::atomic::{AtomicUsize, Ordering};

fn empty_snapshot() -> Snapshot {
    Snapshot::for_conversation("")
}

#[test]
fn confirm_without_pending_row_fails() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let err = confirm_tool(&store, "missing", None).unwrap_err();
    assert!(matches!(err, AssistantError::ActionNotPending));
}

#[test]
fn reject_never_writes_pty() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "pty_write", r#"{"data":"whoami"}"#)
        .unwrap();
    reject_tool(&store, &id).unwrap();
    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "rejected");
}

#[test]
fn reject_without_pending_row_fails() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let err = reject_tool(&store, "missing").unwrap_err();
    assert!(matches!(err, AssistantError::ActionNotPending));
}

#[test]
fn confirm_pty_write_uses_snapshot_session_not_args() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&Snapshot {
            active_session_id: Some("real-session".into()),
            ..Snapshot::for_conversation(&conv.id)
        })
        .unwrap();
    let id = store
        .insert_tool_call(
            &conv.id,
            None,
            "pty_write",
            r#"{"data":"Get-ChildItem","session_id":"forged"}"#,
        )
        .unwrap();
    let map: Arc<Mutex<SessionMap>> = Arc::new(Mutex::new(SessionMap::new()));
    let err = confirm_tool(&store, &id, Some(&map)).unwrap_err();
    assert!(matches!(err, AssistantError::PtySessionGone));
    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "failed");
}

#[test]
fn confirm_pty_write_without_active_session_is_gone() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "pty_write", r#"{"data":"whoami"}"#)
        .unwrap();
    let map: Arc<Mutex<SessionMap>> = Arc::new(Mutex::new(SessionMap::new()));
    let err = confirm_tool(&store, &id, Some(&map)).unwrap_err();
    assert!(matches!(err, AssistantError::PtySessionGone));
    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "failed");
}

#[test]
fn confirm_pty_write_without_pty_handle_is_gone() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&Snapshot {
            active_session_id: Some("real-session".into()),
            ..Snapshot::for_conversation(&conv.id)
        })
        .unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "pty_write", r#"{"data":"whoami"}"#)
        .unwrap();
    let err = confirm_tool(&store, &id, None).unwrap_err();
    assert!(matches!(err, AssistantError::PtySessionGone));
    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "failed");
}

/// Records the last request handed to `generate`, so tests can inspect the
/// system prompt / contents `send_turn` built without a real network call.
struct CapturingTransport {
    request: RefCell<Option<GeminiRequest>>,
    events: Vec<GeminiEvent>,
}

impl CapturingTransport {
    fn new(events: Vec<GeminiEvent>) -> Self {
        Self {
            request: RefCell::new(None),
            events,
        }
    }
}

impl GeminiTransport for CapturingTransport {
    fn generate(&self, request: GeminiRequest) -> Result<Vec<GeminiEvent>, GeminiError> {
        *self.request.borrow_mut() = Some(request);
        Ok(self.events.clone())
    }
}

fn store_with_key(dir: &tempfile::TempDir) -> AssistantStore {
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    seed_app_facts(&store).unwrap();
    store
        .put_secret("gemini_api_key", &IdentityProtector.protect(b"k").unwrap())
        .unwrap();
    store
}

#[test]
fn send_without_key_is_no_api_key() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    let err = send_turn(
        &store,
        &ScriptedTransport { events: vec![] },
        &IdentityProtector,
        &conv.id,
        "hi",
        empty_snapshot(),
    )
    .unwrap_err();
    assert!(matches!(err, AssistantError::NoApiKey));
}

#[test]
fn function_call_becomes_pending_and_does_not_write() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    seed_app_facts(&store).unwrap();
    store
        .put_secret("gemini_api_key", &IdentityProtector.protect(b"k").unwrap())
        .unwrap();
    let conv = store.create_conversation().unwrap();
    let result = send_turn(
        &store,
        &ScriptedTransport {
            events: vec![GeminiEvent::FunctionCall {
                name: "pty_write".into(),
                args_json: r#"{"data":"Get-ChildItem"}"#.into(),
            }],
        },
        &IdentityProtector,
        &conv.id,
        "list files",
        empty_snapshot(),
    )
    .unwrap();
    assert_eq!(result.pending.len(), 1);
    assert_eq!(result.pending[0].status, "pending");
}

#[test]
fn send_turn_persists_user_message_and_stamps_snapshot_conversation_id() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();

    send_turn(
        &store,
        &ScriptedTransport {
            events: vec![GeminiEvent::Text("hello there".into())],
        },
        &IdentityProtector,
        &conv.id,
        "hi",
        empty_snapshot(),
    )
    .unwrap();

    let messages = store.list_messages(&conv.id).unwrap();
    assert_eq!(messages[0].role, "user");
    assert_eq!(messages[0].content, "hi");
    assert_eq!(messages[1].role, "assistant");
    assert_eq!(messages[1].content, "hello there");

    let snapshot = store.latest_snapshot(&conv.id).unwrap().unwrap();
    assert_eq!(snapshot.conversation_id, conv.id);
}

/// Mirrors `send_message`'s IPC-command split: persist the user message and
/// snapshot first (as if that step already ran and succeeded, the way the
/// command does before returning `{ accepted: true }`), then hand off to
/// `continue_turn` for the Gemini call. `continue_turn` must never insert
/// its own copy of the user message or snapshot.
#[test]
fn continue_turn_after_manual_persist_does_not_double_insert_user_message() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();

    store.insert_message(&conv.id, "user", "hi").unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();

    let result = continue_turn(
        &store,
        &ScriptedTransport {
            events: vec![GeminiEvent::Text("hello there".into())],
        },
        &IdentityProtector,
        &conv.id,
        "hi",
    )
    .unwrap();
    assert_eq!(result.assistant_text, "hello there");

    let messages = store.list_messages(&conv.id).unwrap();
    let user_messages: Vec<_> = messages.iter().filter(|m| m.role == "user").collect();
    assert_eq!(
        user_messages.len(),
        1,
        "continue_turn must not insert a second copy of the already-persisted user message"
    );
    assert_eq!(user_messages[0].content, "hi");

    let assistant_messages: Vec<_> = messages.iter().filter(|m| m.role == "assistant").collect();
    assert_eq!(assistant_messages.len(), 1);
    assert_eq!(assistant_messages[0].content, "hello there");
}

/// `continue_turn` still rewrites a still-default title from `user_text`,
/// even though it never persists the message itself.
#[test]
fn continue_turn_rewrites_new_chat_title_without_persisting_message() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();
    assert_eq!(conv.title, "New chat");

    store.insert_message(&conv.id, "user", "hi").unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();

    continue_turn(
        &store,
        &ScriptedTransport { events: vec![] },
        &IdentityProtector,
        &conv.id,
        "hi",
    )
    .unwrap();

    let updated = store.get_conversation(&conv.id).unwrap().unwrap();
    assert_eq!(updated.title, "hi");
    assert_eq!(
        store
            .list_messages(&conv.id)
            .unwrap()
            .iter()
            .filter(|m| m.role == "user")
            .count(),
        1
    );
}

#[test]
fn send_turn_rewrites_new_chat_title_to_first_48_chars() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();
    assert_eq!(conv.title, "New chat");

    let long_text = "a".repeat(80);
    send_turn(
        &store,
        &ScriptedTransport { events: vec![] },
        &IdentityProtector,
        &conv.id,
        &long_text,
        empty_snapshot(),
    )
    .unwrap();

    let updated = store.get_conversation(&conv.id).unwrap().unwrap();
    assert_eq!(updated.title, "a".repeat(48));
}

#[test]
fn send_turn_does_not_rewrite_a_custom_title() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();
    store.set_conversation_title(&conv.id, "My chat").unwrap();

    send_turn(
        &store,
        &ScriptedTransport { events: vec![] },
        &IdentityProtector,
        &conv.id,
        "hi",
        empty_snapshot(),
    )
    .unwrap();

    let updated = store.get_conversation(&conv.id).unwrap().unwrap();
    assert_eq!(updated.title, "My chat");
}

#[test]
fn send_turn_builds_system_prompt_from_app_facts_and_spec_instructions() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();
    let transport = CapturingTransport::new(vec![]);

    send_turn(
        &store,
        &transport,
        &IdentityProtector,
        &conv.id,
        "hi",
        empty_snapshot(),
    )
    .unwrap();

    let request = transport.request.borrow().clone().unwrap();
    assert!(request.system.contains("com.gencore.terminal"));
    assert!(request.system.contains(r"\\?\"));
    assert!(request.system.contains("propose"));
    assert!(request.system.contains("Never claim a command ran"));
    assert!(request.system.to_lowercase().contains("api key"));
}

#[test]
fn resume_turn_persists_tool_result_and_calls_transport_again() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();

    let first = send_turn(
        &store,
        &ScriptedTransport {
            events: vec![GeminiEvent::FunctionCall {
                name: "pty_write".into(),
                args_json: r#"{"data":"Get-ChildItem"}"#.into(),
            }],
        },
        &IdentityProtector,
        &conv.id,
        "list files",
        empty_snapshot(),
    )
    .unwrap();
    let pending_id = first.pending[0].id.clone();

    reject_tool(&store, &pending_id).unwrap();

    let second = resume_turn(
        &store,
        &ScriptedTransport {
            events: vec![GeminiEvent::Text("Okay, skipping that.".into())],
        },
        &IdentityProtector,
        &pending_id,
    )
    .unwrap();

    assert_eq!(second.assistant_text, "Okay, skipping that.");
    assert!(second.pending.is_empty());

    let messages = store.list_messages(&conv.id).unwrap();
    let tool_message = messages
        .iter()
        .find(|message| message.role == "tool")
        .unwrap();
    assert!(tool_message.content.contains("rejected"));
}

#[test]
fn resume_turn_on_still_pending_call_is_invalid_args() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "pty_write", r#"{"data":"whoami"}"#)
        .unwrap();

    let err = resume_turn(
        &store,
        &ScriptedTransport { events: vec![] },
        &IdentityProtector,
        &id,
    )
    .unwrap_err();
    assert!(matches!(err, AssistantError::InvalidArgs));
}

/// Important 8.1: `resume_turn` must check the API key *before* touching the
/// transport — a stale/missing key must never spend a network round trip.
#[test]
fn resume_turn_without_api_key_is_no_api_key_and_never_calls_transport() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    seed_app_facts(&store).unwrap();
    let conv = store.create_conversation().unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "pty_write", r#"{"data":"whoami"}"#)
        .unwrap();
    reject_tool(&store, &id).unwrap();

    let calls = Arc::new(AtomicUsize::new(0));
    let transport = CountingTransport {
        calls: calls.clone(),
        events: vec![],
    };

    let err = resume_turn(&store, &transport, &IdentityProtector, &id).unwrap_err();
    assert!(matches!(err, AssistantError::NoApiKey));
    assert_eq!(calls.load(Ordering::SeqCst), 0);
}

/// Counts `generate` calls; used to assert a guard (API key, cancellation)
/// short-circuits before the transport is ever touched.
struct CountingTransport {
    calls: Arc<AtomicUsize>,
    events: Vec<GeminiEvent>,
}

impl GeminiTransport for CountingTransport {
    fn generate(&self, _request: GeminiRequest) -> Result<Vec<GeminiEvent>, GeminiError> {
        self.calls.fetch_add(1, Ordering::SeqCst);
        Ok(self.events.clone())
    }
}

/// Important 8.2: a resolved tool call must reach Gemini as an official
/// `functionCall` / `functionResponse` part pair, not only the paraphrased
/// `tool` ledger text.
#[test]
fn resume_turn_sends_function_response_part_not_only_paraphrased_text() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();

    let first = send_turn(
        &store,
        &ScriptedTransport {
            events: vec![GeminiEvent::FunctionCall {
                name: "pty_write".into(),
                args_json: r#"{"data":"Get-ChildItem"}"#.into(),
            }],
        },
        &IdentityProtector,
        &conv.id,
        "list files",
        empty_snapshot(),
    )
    .unwrap();
    let pending_id = first.pending[0].id.clone();
    reject_tool(&store, &pending_id).unwrap();

    let transport = CapturingTransport::new(vec![GeminiEvent::Text("ok".into())]);
    resume_turn(&store, &transport, &IdentityProtector, &pending_id).unwrap();

    let request = transport.request.borrow().clone().unwrap();
    let contents = serde_json::to_value(&request.contents).unwrap();
    let contents_str = contents.to_string();

    assert!(
        contents_str.contains("functionCall"),
        "model turn must replay Gemini's own functionCall shape: {contents_str}"
    );
    assert!(
        contents_str.contains("functionResponse"),
        "resolved call must reach Gemini as a functionResponse part: {contents_str}"
    );
    assert!(
        !contents_str.contains("rejected by the user"),
        "the flattened `tool` ledger text must not also be sent as a duplicate user line: {contents_str}"
    );
}

/// Important 8.2: replaying a `pty_write` call's `args_json` back to Gemini
/// must never include a `session_id` — the model was never offered that key.
#[test]
fn resume_turn_function_call_part_drops_session_id_from_args() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();

    let first = send_turn(
        &store,
        &ScriptedTransport {
            events: vec![GeminiEvent::FunctionCall {
                name: "pty_write".into(),
                args_json: r#"{"data":"Get-ChildItem","session_id":"forged"}"#.into(),
            }],
        },
        &IdentityProtector,
        &conv.id,
        "list files",
        empty_snapshot(),
    )
    .unwrap();
    let pending_id = first.pending[0].id.clone();
    reject_tool(&store, &pending_id).unwrap();

    let transport = CapturingTransport::new(vec![]);
    resume_turn(&store, &transport, &IdentityProtector, &pending_id).unwrap();

    let request = transport.request.borrow().clone().unwrap();
    let contents_str = serde_json::to_value(&request.contents).unwrap().to_string();
    assert!(!contents_str.contains("session_id"));
    assert!(!contents_str.contains("forged"));
}

/// Important 1: the system prompt must carry the conversation's current
/// snapshot (cwd / active tab / output excerpt), not just app facts.
#[test]
fn send_turn_system_prompt_contains_snapshot_fields() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();
    let transport = CapturingTransport::new(vec![]);

    let snapshot = Snapshot {
        cwd: Some("C:\\Users\\dev".into()),
        active_tab_id: Some("tab-1".into()),
        active_session_id: Some("session-1".into()),
        output_excerpt: "PS C:\\Users\\dev> Get-ChildItem".into(),
        ..Snapshot::for_conversation(&conv.id)
    };

    send_turn(
        &store,
        &transport,
        &IdentityProtector,
        &conv.id,
        "hi",
        snapshot,
    )
    .unwrap();

    let request = transport.request.borrow().clone().unwrap();
    assert!(request.system.contains("C:\\Users\\dev"));
    assert!(request.system.contains("tab-1"));
    assert!(request.system.contains("Get-ChildItem"));
}

/// Important 1: with no snapshot yet, the prompt says so explicitly instead
/// of silently omitting the section (so the model does not invent tabs).
#[test]
fn system_prompt_without_snapshot_says_so_explicitly() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();
    let transport = CapturingTransport::new(vec![]);

    store.insert_message(&conv.id, "user", "hi").unwrap();
    continue_turn(&store, &transport, &IdentityProtector, &conv.id, "hi").unwrap();

    let request = transport.request.borrow().clone().unwrap();
    assert!(request.system.contains("no snapshot is available yet"));
}

/// Important 4 / Important 5: a cancelled `generate` call must never reach
/// `finish_turn` — no assistant message or pending tool_call for a turn
/// that never produced any events.
#[test]
fn cancelled_generate_persists_no_assistant_message_or_pending() {
    struct CancellingTransport;
    impl GeminiTransport for CancellingTransport {
        fn generate(&self, _request: GeminiRequest) -> Result<Vec<GeminiEvent>, GeminiError> {
            Err(GeminiError::Cancelled)
        }
    }

    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();
    store.insert_message(&conv.id, "user", "hi").unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();

    let err = continue_turn(
        &store,
        &CancellingTransport,
        &IdentityProtector,
        &conv.id,
        "hi",
    )
    .unwrap_err();
    assert!(matches!(err, AssistantError::Cancelled));

    let messages = store.list_messages(&conv.id).unwrap();
    assert!(messages.iter().all(|message| message.role != "assistant"));

    let pending = store.list_pending_tool_calls(&conv.id).unwrap();
    assert!(pending.is_empty());
}

/// Important 5: `prepare_turn` builds the request and returns without ever
/// touching a transport, so the IPC layer can drop its store connection
/// before the (up to 120s) Gemini call and reopen a fresh one only for
/// `finish_turn`.
#[test]
fn prepare_turn_then_finish_turn_round_trips_like_continue_turn() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();
    store.insert_message(&conv.id, "user", "hi").unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();

    let request = prepare_turn(&store, &IdentityProtector, &conv.id, "hi").unwrap();
    assert!(request.system.contains("com.gencore.terminal"));

    // No store reference needs to be held here — this simulates the
    // dropped-connection window around the real HTTP call.
    let events = vec![GeminiEvent::Text("hello there".into())];

    let result = finish_turn(&store, &conv.id, events).unwrap();
    assert_eq!(result.assistant_text, "hello there");

    let messages = store.list_messages(&conv.id).unwrap();
    assert_eq!(messages.last().unwrap().content, "hello there");
}

/// Important 5 / Important 8: `prepare_resume` persists the `tool` ledger
/// message and returns the next request without touching a transport.
#[test]
fn prepare_resume_then_finish_turn_round_trips_like_resume_turn() {
    let dir = tempfile::tempdir().unwrap();
    let store = store_with_key(&dir);
    let conv = store.create_conversation().unwrap();

    let first = send_turn(
        &store,
        &ScriptedTransport {
            events: vec![GeminiEvent::FunctionCall {
                name: "pty_write".into(),
                args_json: r#"{"data":"Get-ChildItem"}"#.into(),
            }],
        },
        &IdentityProtector,
        &conv.id,
        "list files",
        empty_snapshot(),
    )
    .unwrap();
    let pending_id = first.pending[0].id.clone();
    reject_tool(&store, &pending_id).unwrap();

    let (conversation_id, request) =
        prepare_resume(&store, &IdentityProtector, &pending_id).unwrap();
    assert_eq!(conversation_id, conv.id);
    assert!(
        serde_json::to_value(&request.contents)
            .unwrap()
            .to_string()
            .contains("functionResponse")
    );

    let result = finish_turn(
        &store,
        &conversation_id,
        vec![GeminiEvent::Text("done".into())],
    )
    .unwrap();
    assert_eq!(result.assistant_text, "done");
}
