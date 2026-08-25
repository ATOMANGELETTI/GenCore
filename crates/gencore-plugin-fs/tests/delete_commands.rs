use std::future::Future;

use gencore_fs::{DeleteArgs, DeleteError, delete};

fn block_on<F: Future>(future: F) -> F::Output {
    tauri::async_runtime::block_on(future)
}

#[test]
fn delete_moves_file_to_recycle_bin() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().join("gone.txt");
    std::fs::write(&path, b"bye").expect("write gone.txt");

    block_on(delete(vec![path.to_string_lossy().into_owned()])).expect("delete should succeed");

    assert!(!path.exists(), "deleted file must no longer be on disk");
}

#[test]
fn delete_empty_list_is_a_no_op() {
    block_on(delete(Vec::new())).expect("deleting an empty list should succeed");
}

#[test]
fn delete_missing_path_returns_not_found() {
    let dir = tempfile::tempdir().expect("temp dir");
    let missing = dir.path().join("missing.txt");

    let result = block_on(delete(vec![missing.to_string_lossy().into_owned()]));
    assert!(matches!(result, Err(DeleteError::NotFound)));
}

#[test]
fn delete_args_reject_unknown_fields() {
    let json = serde_json::json!({ "paths": ["/tmp/a.txt"], "unexpected": true });
    let parsed: Result<DeleteArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}
