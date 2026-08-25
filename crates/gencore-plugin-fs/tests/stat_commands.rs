use std::future::Future;

use gencore_fs::{FsKind, StatArgs, StatError, stat};

fn block_on<F: Future>(future: F) -> F::Output {
    tauri::async_runtime::block_on(future)
}

#[test]
fn stat_file_returns_size_and_timestamps() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().join("report.pdf");
    std::fs::write(&path, b"hello").expect("write report.pdf");

    let result = block_on(stat(path.to_string_lossy().into_owned())).expect("stat should succeed");

    assert_eq!(result.name, "report.pdf");
    assert_eq!(result.kind, FsKind::File);
    assert_eq!(result.extension.as_deref(), Some("pdf"));
    assert_eq!(result.size, Some(5));
    assert!(result.modified_ms.is_some());
    assert!(result.created_ms.is_some());
    assert!(!result.readonly);
    assert!(!result.hidden);
    assert!(!result.system);
}

#[test]
fn stat_directory_has_no_size() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().join("folder");
    std::fs::create_dir(&path).expect("create folder");

    let result = block_on(stat(path.to_string_lossy().into_owned())).expect("stat should succeed");

    assert_eq!(result.kind, FsKind::Dir);
    assert_eq!(result.size, None);
}

#[test]
fn stat_missing_path_returns_not_found() {
    let dir = tempfile::tempdir().expect("temp dir");
    let missing = dir.path().join("missing.txt");

    let result = block_on(stat(missing.to_string_lossy().into_owned()));
    assert!(matches!(result, Err(StatError::NotFound)));
}

#[test]
fn stat_result_serializes_timestamps_as_camel_case() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().join("a.txt");
    std::fs::write(&path, b"hi").expect("write a.txt");

    let result = block_on(stat(path.to_string_lossy().into_owned())).expect("stat should succeed");
    let json = serde_json::to_value(&result).expect("serialize StatResult");

    for key in ["createdMs", "modifiedMs", "accessedMs"] {
        assert!(
            json.get(key).is_some(),
            "expected camelCase key {key}: {json}"
        );
    }
    for key in ["created_ms", "modified_ms", "accessed_ms"] {
        assert!(
            json.get(key).is_none(),
            "unexpected snake_case key {key}: {json}"
        );
    }
}

#[test]
fn stat_args_reject_unknown_fields() {
    let json = serde_json::json!({ "path": "/tmp/a.txt", "unexpected": true });
    let parsed: Result<StatArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}
