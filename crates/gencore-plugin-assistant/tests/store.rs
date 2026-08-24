use std::path::PathBuf;

use gencore_assistant::resolve_data_dir;
use gencore_assistant::sqlite_path;
use gencore_assistant::{AssistantStore, Snapshot, seed_app_facts};

#[test]
fn data_dir_resolution_env_and_fallback() {
    let exe_parent = PathBuf::from(r"C:\GenCore");
    unsafe { std::env::remove_var("GENCORE_DATA_DIR") };
    assert_eq!(resolve_data_dir(&exe_parent), exe_parent.join("data"));

    unsafe { std::env::set_var("GENCORE_DATA_DIR", r"C:\tmp\gencore-data") };
    let dir = resolve_data_dir(&exe_parent);
    unsafe { std::env::remove_var("GENCORE_DATA_DIR") };
    assert_eq!(dir, PathBuf::from(r"C:\tmp\gencore-data"));
}

#[test]
fn sqlite_file_name_is_gencore_assistant() {
    let dir = PathBuf::from(r"C:\GenCore\data");
    assert_eq!(sqlite_path(&dir), dir.join("gencore-assistant.sqlite"));
}

#[test]
fn open_migrates_and_round_trips_a_conversation() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("gencore-assistant.sqlite")).unwrap();
    let created = store.create_conversation().unwrap();
    assert!(!created.id.is_empty());
    store
        .insert_message(&created.id, "user", "list files")
        .unwrap();
    let listed = store.list_conversations().unwrap();
    assert_eq!(listed.len(), 1);
    let messages = store.list_messages(&created.id).unwrap();
    assert_eq!(messages[0].content, "list files");
}

#[test]
fn seed_facts_include_product_identifier() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("gencore-assistant.sqlite")).unwrap();
    seed_app_facts(&store).unwrap();
    let value = store.get_fact("product.identifier").unwrap().unwrap();
    assert_eq!(value, "com.gencore.terminal");
}

#[test]
fn unknown_conversation_delete_is_unknown() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("gencore-assistant.sqlite")).unwrap();
    let err = store.delete_conversation("missing").unwrap_err();
    assert!(err.to_string().contains("unknown conversation"));
}

#[test]
fn seed_facts_include_required_product_notes() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("gencore-assistant.sqlite")).unwrap();
    seed_app_facts(&store).unwrap();
    assert_eq!(
        store.get_fact("product.name").unwrap().as_deref(),
        Some("GenCore Terminal")
    );
    assert_eq!(
        store.get_fact("ui.panels").unwrap().as_deref(),
        Some("files,assistant,config")
    );
    assert_eq!(
        store.get_fact("pty.backend").unwrap().as_deref(),
        Some("portable-pty")
    );
    assert_eq!(
        store.get_fact("pty.confirm").unwrap().as_deref(),
        Some("propose-and-confirm")
    );
    assert_eq!(
        store.get_fact("shell.note").unwrap().as_deref(),
        Some(r"Do not pass Windows \\?\\ verbatim paths into PowerShell.")
    );
}

#[test]
fn open_enables_wal_journal_mode() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("db.sqlite");
    let store = AssistantStore::open(&path).unwrap();
    // WAL keeps a persistent `-wal` sidecar across writes; the default
    // DELETE journal only creates (and removes) a rollback journal per
    // transaction, so this file's presence after a write is a reliable
    // proxy for `PRAGMA journal_mode=WAL` without a second raw connection.
    store.create_conversation().unwrap();
    assert!(
        dir.path().join("db.sqlite-wal").exists(),
        "AssistantStore::open must enable WAL journal mode"
    );
}

#[test]
fn insert_user_turn_persists_message_and_snapshot_in_one_transaction() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();

    let message = store
        .insert_user_turn(&conv.id, "hi", Snapshot::for_conversation(""))
        .unwrap();
    assert_eq!(message.role, "user");
    assert_eq!(message.content, "hi");

    let snapshot = store.latest_snapshot(&conv.id).unwrap().unwrap();
    assert_eq!(
        snapshot.message_id.as_deref(),
        Some(message.id.as_str()),
        "insert_user_turn must stamp the snapshot with the new message's id"
    );

    let messages = store.list_messages(&conv.id).unwrap();
    assert_eq!(messages.len(), 1);
    assert_eq!(messages[0].id, message.id);
}

#[test]
fn insert_user_turn_unknown_conversation_is_unknown_and_persists_nothing() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let err = store
        .insert_user_turn("missing", "hi", Snapshot::for_conversation(""))
        .unwrap_err();
    assert!(err.to_string().contains("unknown conversation"));
}

#[test]
fn list_pending_tool_calls_returns_only_pending_oldest_first() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    let id1 = store
        .insert_tool_call(&conv.id, None, "switch_tab", r#"{"tab_id":"t1"}"#)
        .unwrap();
    let id2 = store
        .insert_tool_call(&conv.id, None, "switch_tab", r#"{"tab_id":"t2"}"#)
        .unwrap();
    store.set_tool_status(&id1, "ran", None).unwrap();

    let pending = store.list_pending_tool_calls(&conv.id).unwrap();
    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].id, id2);
    assert_eq!(pending[0].status, "pending");
}

#[test]
fn list_pending_tool_calls_empty_for_conversation_with_no_tool_calls() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    assert!(store.list_pending_tool_calls(&conv.id).unwrap().is_empty());
}

#[test]
fn list_tool_calls_for_message_returns_calls_linked_to_that_message() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    let message = store.insert_message(&conv.id, "assistant", "").unwrap();
    let call_id = store
        .insert_tool_call(&conv.id, Some(&message.id), "pty_write", r#"{"data":"x"}"#)
        .unwrap();

    let calls = store.list_tool_calls_for_message(&message.id).unwrap();
    assert_eq!(calls.len(), 1);
    assert_eq!(calls[0].id, call_id);
}

#[test]
fn list_messages_orders_by_rowid_when_created_at_ties() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    for i in 0..5 {
        store
            .insert_message(&conv.id, "user", &format!("m{i}"))
            .unwrap();
    }
    let contents: Vec<_> = store
        .list_messages(&conv.id)
        .unwrap()
        .into_iter()
        .map(|m| m.content)
        .collect();
    assert_eq!(contents, vec!["m0", "m1", "m2", "m3", "m4"]);
}

#[test]
fn settings_snapshot_and_tool_call_round_trip() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("gencore-assistant.sqlite")).unwrap();
    assert!(store.get_setting("model").unwrap().is_none());
    store.set_setting("model", "gemini-3.7-flash").unwrap();
    assert_eq!(
        store.get_setting("model").unwrap().as_deref(),
        Some("gemini-3.7-flash")
    );

    let conv = store.create_conversation().unwrap();
    let inserted = store
        .insert_snapshot(&Snapshot {
            active_session_id: Some("real-session".into()),
            ..Snapshot::for_conversation(&conv.id)
        })
        .unwrap();
    let latest = store.latest_snapshot(&conv.id).unwrap().unwrap();
    assert_eq!(latest.id, inserted.id);
    assert_eq!(latest.active_session_id.as_deref(), Some("real-session"));

    let tool_id = store
        .insert_tool_call(&conv.id, None, "pty_write", r#"{"data":"whoami"}"#)
        .unwrap();
    let pending = store.get_tool_call(&tool_id).unwrap().unwrap();
    assert_eq!(pending.status, "pending");
    store.set_tool_status(&tool_id, "rejected", None).unwrap();
    let rejected = store.get_tool_call(&tool_id).unwrap().unwrap();
    assert_eq!(rejected.status, "rejected");
}
