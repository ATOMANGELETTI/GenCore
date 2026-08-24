use gencore_assistant::{AssistantError, AssistantStore, Snapshot, confirm_tool, reject_tool};

#[test]
fn confirm_switch_tab_returns_ui_action_and_marks_ran() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "switch_tab", r#"{"tab_id":"tab-2"}"#)
        .unwrap();

    let outcome = confirm_tool(&store, &id, None).unwrap();
    assert_eq!(outcome.name, "switch_tab");
    let ui_action = outcome.ui_action.expect("switch_tab returns a ui_action");
    assert_eq!(ui_action.name, "switch_tab");
    assert_eq!(ui_action.args["tab_id"], "tab-2");

    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "ran");
}

#[test]
fn confirm_reveal_in_files_returns_ui_action_and_marks_ran() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "reveal_in_files", r#"{"path":"C:\\repo"}"#)
        .unwrap();

    let outcome = confirm_tool(&store, &id, None).unwrap();
    assert_eq!(outcome.name, "reveal_in_files");
    let ui_action = outcome
        .ui_action
        .expect("reveal_in_files returns a ui_action");
    assert_eq!(ui_action.name, "reveal_in_files");
    assert_eq!(ui_action.args["path"], "C:\\repo");

    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "ran");
}

#[test]
fn confirm_unknown_tool_name_is_invalid_args_and_marks_failed() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "delete_everything", "{}")
        .unwrap();

    let err = confirm_tool(&store, &id, None).unwrap_err();
    assert!(matches!(err, AssistantError::InvalidArgs));

    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "failed");
}

#[test]
fn confirm_switch_tab_missing_tab_id_is_invalid_args() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "switch_tab", "{}")
        .unwrap();

    let err = confirm_tool(&store, &id, None).unwrap_err();
    assert!(matches!(err, AssistantError::InvalidArgs));

    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "failed");
}

#[test]
fn reject_switch_tab_marks_rejected() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "switch_tab", r#"{"tab_id":"tab-2"}"#)
        .unwrap();

    reject_tool(&store, &id).unwrap();

    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "rejected");
}

#[test]
fn confirm_git_stage_returns_ui_action() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "git_stage", r#"{"path":"src/app.tsx"}"#)
        .unwrap();

    let outcome = confirm_tool(&store, &id, None).unwrap();
    assert_eq!(outcome.name, "git_stage");
    let ui_action = outcome.ui_action.expect("git_stage returns a ui_action");
    assert_eq!(ui_action.name, "git_stage");
    assert_eq!(ui_action.args["path"], "src/app.tsx");

    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "ran");
}

#[test]
fn confirm_git_commit_returns_ui_action() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();
    let id = store
        .insert_tool_call(
            &conv.id,
            None,
            "git_commit",
            r#"{"message":"feat: add feature"}"#,
        )
        .unwrap();

    let outcome = confirm_tool(&store, &id, None).unwrap();
    assert_eq!(outcome.name, "git_commit");
    let ui_action = outcome.ui_action.expect("git_commit returns a ui_action");
    assert_eq!(ui_action.name, "git_commit");
    assert_eq!(ui_action.args["message"], "feat: add feature");

    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "ran");
}

#[test]
fn confirm_git_create_branch_returns_ui_action() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();
    let id = store
        .insert_tool_call(
            &conv.id,
            None,
            "git_create_branch",
            r#"{"branch":"feat/new-view"}"#,
        )
        .unwrap();

    let outcome = confirm_tool(&store, &id, None).unwrap();
    assert_eq!(outcome.name, "git_create_branch");
    let ui_action = outcome
        .ui_action
        .expect("git_create_branch returns a ui_action");
    assert_eq!(ui_action.name, "git_create_branch");
    assert_eq!(ui_action.args["branch"], "feat/new-view");

    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "ran");
}

#[test]
fn confirm_git_stash_returns_ui_action() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let conv = store.create_conversation().unwrap();
    store
        .insert_snapshot(&Snapshot::for_conversation(&conv.id))
        .unwrap();
    let id = store
        .insert_tool_call(&conv.id, None, "git_stash", r#"{"message":"WIP"}"#)
        .unwrap();

    let outcome = confirm_tool(&store, &id, None).unwrap();
    assert_eq!(outcome.name, "git_stash");
    let ui_action = outcome.ui_action.expect("git_stash returns a ui_action");
    assert_eq!(ui_action.name, "git_stash");
    assert_eq!(ui_action.args["message"], "WIP");

    let row = store.get_tool_call(&id).unwrap().unwrap();
    assert_eq!(row.status, "ran");
}
