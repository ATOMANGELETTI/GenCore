use std::sync::{Arc, Mutex};

use gencore_assistant::{AssistantError, AssistantStore, Snapshot, confirm_tool, reject_tool};
use gencore_pty::SessionMap;

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
