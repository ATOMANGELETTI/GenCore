use std::cell::RefCell;
use std::sync::{Arc, Mutex};

use gencore_assistant::{
    AssistantError, AssistantStore, GeminiError, GeminiEvent, GeminiRequest, GeminiTransport,
    IdentityProtector, ScriptedTransport, SecretProtector, Snapshot, confirm_tool, reject_tool,
    resume_turn, seed_app_facts, send_turn,
};
use gencore_pty::SessionMap;

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

    let err = resume_turn(&store, &ScriptedTransport { events: vec![] }, &id).unwrap_err();
    assert!(matches!(err, AssistantError::InvalidArgs));
}
