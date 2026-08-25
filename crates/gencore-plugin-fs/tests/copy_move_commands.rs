use std::future::Future;

use gencore_fs::{CopyArgs, CopyError, MoveArgs, MoveError, copy, move_paths};

fn block_on<F: Future>(future: F) -> F::Output {
    tauri::async_runtime::block_on(future)
}

#[test]
fn copy_file_leaves_source_and_creates_target() {
    let dir = tempfile::tempdir().expect("temp dir");
    let dest = dir.path().join("dest");
    std::fs::create_dir(&dest).expect("create dest");
    let source = dir.path().join("source.txt");
    std::fs::write(&source, b"hello").expect("write source.txt");

    block_on(copy(
        vec![source.to_string_lossy().into_owned()],
        dest.to_string_lossy().into_owned(),
    ))
    .expect("copy should succeed");

    assert!(source.exists(), "copy must not remove the source");
    let copied = dest.join("source.txt");
    assert_eq!(std::fs::read(&copied).unwrap(), b"hello");
}

#[test]
fn copy_directory_recurses_into_children() {
    let dir = tempfile::tempdir().expect("temp dir");
    let dest = dir.path().join("dest");
    std::fs::create_dir(&dest).expect("create dest");
    let source = dir.path().join("source");
    std::fs::create_dir(&source).expect("create source");
    std::fs::write(source.join("child.txt"), b"nested").expect("write child.txt");

    block_on(copy(
        vec![source.to_string_lossy().into_owned()],
        dest.to_string_lossy().into_owned(),
    ))
    .expect("copy should succeed");

    let copied_child = dest.join("source").join("child.txt");
    assert_eq!(std::fs::read(&copied_child).unwrap(), b"nested");
}

#[test]
fn copy_name_collision_auto_suffixes_instead_of_overwriting() {
    let dir = tempfile::tempdir().expect("temp dir");
    let dest = dir.path().join("dest");
    std::fs::create_dir(&dest).expect("create dest");
    std::fs::write(dest.join("source.txt"), b"original").expect("write existing target");
    let source = dir.path().join("source.txt");
    std::fs::write(&source, b"copied").expect("write source.txt");

    block_on(copy(
        vec![source.to_string_lossy().into_owned()],
        dest.to_string_lossy().into_owned(),
    ))
    .expect("copy should succeed");

    assert_eq!(std::fs::read(dest.join("source.txt")).unwrap(), b"original");
    assert_eq!(
        std::fs::read(dest.join("source (2).txt")).unwrap(),
        b"copied",
        "collision must be auto-suffixed, never overwrite the existing entry"
    );
}

#[test]
fn copy_destination_not_a_directory_is_rejected() {
    let dir = tempfile::tempdir().expect("temp dir");
    let dest_file = dir.path().join("dest.txt");
    std::fs::write(&dest_file, b"not a dir").expect("write dest.txt");
    let source = dir.path().join("source.txt");
    std::fs::write(&source, b"hello").expect("write source.txt");

    let result = block_on(copy(
        vec![source.to_string_lossy().into_owned()],
        dest_file.to_string_lossy().into_owned(),
    ));
    assert!(matches!(result, Err(CopyError::DestinationNotADirectory)));
}

#[test]
fn move_paths_relocates_file_and_removes_source() {
    let dir = tempfile::tempdir().expect("temp dir");
    let dest = dir.path().join("dest");
    std::fs::create_dir(&dest).expect("create dest");
    let source = dir.path().join("source.txt");
    std::fs::write(&source, b"hello").expect("write source.txt");

    block_on(move_paths(
        vec![source.to_string_lossy().into_owned()],
        dest.to_string_lossy().into_owned(),
    ))
    .expect("move should succeed");

    assert!(!source.exists(), "move must remove the source");
    assert_eq!(std::fs::read(dest.join("source.txt")).unwrap(), b"hello");
}

#[test]
fn move_paths_name_collision_auto_suffixes() {
    let dir = tempfile::tempdir().expect("temp dir");
    let dest = dir.path().join("dest");
    std::fs::create_dir(&dest).expect("create dest");
    std::fs::write(dest.join("source.txt"), b"original").expect("write existing target");
    let source = dir.path().join("source.txt");
    std::fs::write(&source, b"moved").expect("write source.txt");

    block_on(move_paths(
        vec![source.to_string_lossy().into_owned()],
        dest.to_string_lossy().into_owned(),
    ))
    .expect("move should succeed");

    assert_eq!(std::fs::read(dest.join("source.txt")).unwrap(), b"original");
    assert_eq!(
        std::fs::read(dest.join("source (2).txt")).unwrap(),
        b"moved"
    );
}

#[test]
fn copy_args_reject_unknown_fields() {
    let json = serde_json::json!({ "paths": ["/tmp/a.txt"], "destination_dir": "/tmp/dest", "unexpected": true });
    let parsed: Result<CopyArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn move_args_reject_unknown_fields() {
    let json = serde_json::json!({ "paths": ["/tmp/a.txt"], "destination_dir": "/tmp/dest", "unexpected": true });
    let parsed: Result<MoveArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn move_destination_not_a_directory_is_rejected() {
    let dir = tempfile::tempdir().expect("temp dir");
    let dest_file = dir.path().join("dest.txt");
    std::fs::write(&dest_file, b"not a dir").expect("write dest.txt");
    let source = dir.path().join("source.txt");
    std::fs::write(&source, b"hello").expect("write source.txt");

    let result = block_on(move_paths(
        vec![source.to_string_lossy().into_owned()],
        dest_file.to_string_lossy().into_owned(),
    ));
    assert!(matches!(result, Err(MoveError::DestinationNotADirectory)));
}
