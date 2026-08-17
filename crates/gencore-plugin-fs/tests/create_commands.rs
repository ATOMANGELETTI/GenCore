use std::future::Future;
use std::path::Path;
use std::pin::pin;
use std::task::{Context, Poll, Waker};

use gencore_fs::{
    CreateDirArgs, CreateDirError, CreateFileArgs, CreateFileError, FsKind, ListArgs, create_dir,
    create_file, list,
};

/// Minimal executor matching `list_commands.rs` for driving async commands.
fn block_on<F: Future>(future: F) -> F::Output {
    let mut future = pin!(future);
    let waker = Waker::noop();
    let mut cx = Context::from_waker(waker);
    loop {
        if let Poll::Ready(value) = future.as_mut().poll(&mut cx) {
            return value;
        }
    }
}

fn join_name(parent: &Path, name: &str) -> String {
    format!("{}{}{}", parent.display(), std::path::MAIN_SEPARATOR, name)
}

#[test]
fn create_file_in_temp_dir_is_listed_empty() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().join("new.txt");
    let path_str = path.to_string_lossy().into_owned();

    block_on(create_file(CreateFileArgs {
        path: path_str.clone(),
    }))
    .expect("create_file should succeed");

    let listed = block_on(list(ListArgs {
        path: dir.path().to_string_lossy().into_owned(),
    }))
    .expect("list should succeed");

    let entry = listed
        .entries
        .iter()
        .find(|entry| entry.name == "new.txt")
        .expect("new.txt should appear in list");
    assert_eq!(entry.kind, FsKind::File);
    assert_eq!(
        std::fs::metadata(&path).unwrap().len(),
        0,
        "created file must be empty (0 bytes)"
    );
}

#[test]
fn create_file_second_call_returns_already_exists() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().join("dup.txt").to_string_lossy().into_owned();

    block_on(create_file(CreateFileArgs { path: path.clone() })).expect("first create_file");

    let second = block_on(create_file(CreateFileArgs { path }));
    assert!(matches!(second, Err(CreateFileError::AlreadyExists)));
}

#[test]
fn create_file_rejects_reserved_and_illegal_names() {
    let dir = tempfile::tempdir().expect("temp dir");
    let parent = dir.path();

    for name in ["NUL", "foo:bar", "bad<>.txt", "CON.txt"] {
        let result = block_on(create_file(CreateFileArgs {
            path: join_name(parent, name),
        }));
        assert!(
            matches!(result, Err(CreateFileError::InvalidName)),
            "{name} should be InvalidName before I/O, got {result:?}"
        );
    }
}

#[test]
fn create_dir_is_listed_as_dir() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().join("folder");

    block_on(create_dir(CreateDirArgs {
        path: path.to_string_lossy().into_owned(),
    }))
    .expect("create_dir should succeed");

    let listed = block_on(list(ListArgs {
        path: dir.path().to_string_lossy().into_owned(),
    }))
    .expect("list should succeed");

    let entry = listed
        .entries
        .iter()
        .find(|entry| entry.name == "folder")
        .expect("folder should appear in list");
    assert_eq!(entry.kind, FsKind::Dir);
}

#[test]
fn create_dir_missing_parent_returns_not_found() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().join("missing").join("child");

    let result = block_on(create_dir(CreateDirArgs {
        path: path.to_string_lossy().into_owned(),
    }));
    assert!(matches!(result, Err(CreateDirError::NotFound)));
}

#[test]
fn create_file_args_reject_unknown_fields() {
    let json = serde_json::json!({ "path": "/tmp/a.txt", "unexpected": true });
    let parsed: Result<CreateFileArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn create_dir_args_reject_unknown_fields() {
    let json = serde_json::json!({ "path": "/tmp/dir", "unexpected": true });
    let parsed: Result<CreateDirArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}
