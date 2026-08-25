use std::future::Future;

use gencore_fs::{RenameArgs, RenameError, rename};

fn block_on<F: Future>(future: F) -> F::Output {
    tauri::async_runtime::block_on(future)
}

#[test]
fn rename_file_moves_within_same_parent() {
    let dir = tempfile::tempdir().expect("temp dir");
    let original = dir.path().join("old.txt");
    std::fs::write(&original, b"hi").expect("write old.txt");

    let result = block_on(rename(
        original.to_string_lossy().into_owned(),
        "new.txt".into(),
    ))
    .expect("rename should succeed");

    let expected = dir.path().join("new.txt");
    assert_eq!(result.path, expected.to_string_lossy());
    assert!(!original.exists());
    assert!(expected.exists());
}

#[test]
fn rename_rejects_name_containing_path_separator() {
    let dir = tempfile::tempdir().expect("temp dir");
    let original = dir.path().join("old.txt");
    std::fs::write(&original, b"hi").expect("write old.txt");

    let result = block_on(rename(
        original.to_string_lossy().into_owned(),
        r"..\escaped.txt".into(),
    ));
    assert!(matches!(result, Err(RenameError::InvalidName)));
    assert!(
        original.exists(),
        "rename must not move the file on rejection"
    );
}

#[test]
fn rename_to_existing_name_returns_already_exists() {
    let dir = tempfile::tempdir().expect("temp dir");
    let a = dir.path().join("a.txt");
    let b = dir.path().join("b.txt");
    std::fs::write(&a, b"a").expect("write a.txt");
    std::fs::write(&b, b"b").expect("write b.txt");

    let result = block_on(rename(a.to_string_lossy().into_owned(), "b.txt".into()));
    assert!(matches!(result, Err(RenameError::AlreadyExists)));
}

#[test]
fn rename_missing_path_returns_not_found() {
    let dir = tempfile::tempdir().expect("temp dir");
    let missing = dir.path().join("missing.txt");

    let result = block_on(rename(
        missing.to_string_lossy().into_owned(),
        "new.txt".into(),
    ));
    assert!(matches!(result, Err(RenameError::NotFound)));
}

#[test]
fn rename_args_reject_unknown_fields() {
    let json = serde_json::json!({ "path": "/tmp/a.txt", "new_name": "b.txt", "unexpected": true });
    let parsed: Result<RenameArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}
