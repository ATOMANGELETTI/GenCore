use std::path::PathBuf;

use gencore_assistant::resolve_data_dir;
use gencore_assistant::sqlite_path;
use gencore_assistant::{AssistantStore, Snapshot, seed_app_facts};

#[test]
fn data_dir_prefers_gencore_data_dir_env() {
    let exe_parent = PathBuf::from(r"C:\does-not-matter");
    unsafe { std::env::set_var("GENCORE_DATA_DIR", r"C:\tmp\gencore-data") };
    let dir = resolve_data_dir(&exe_parent);
    unsafe { std::env::remove_var("GENCORE_DATA_DIR") };
    assert_eq!(dir, PathBuf::from(r"C:\tmp\gencore-data"));
}

#[test]
fn data_dir_falls_back_to_exe_parent_data() {
    unsafe { std::env::remove_var("GENCORE_DATA_DIR") };
    let exe_parent = PathBuf::from(r"C:\GenCore");
    assert_eq!(resolve_data_dir(&exe_parent), exe_parent.join("data"));
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
