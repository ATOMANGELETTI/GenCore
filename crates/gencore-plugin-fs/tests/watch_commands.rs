use std::sync::mpsc;
use std::time::Duration;

use gencore_fs::{
    AccessKind, CreateKind, DataChange, EntryChangeKind, EventKind, ModifyKind, RemoveKind,
    RenameMode, UnwatchArgs, WatchError, WatchMap, apply_debounced_events, map_event_kind,
    start_watch, stop_watch,
};

#[test]
fn map_event_kind_maps_create_delete_modify_rename() {
    assert_eq!(
        map_event_kind(EventKind::Create(CreateKind::Any)),
        Some(EntryChangeKind::Created)
    );
    assert_eq!(
        map_event_kind(EventKind::Remove(RemoveKind::Any)),
        Some(EntryChangeKind::Deleted)
    );
    assert_eq!(
        map_event_kind(EventKind::Modify(ModifyKind::Data(DataChange::Any))),
        Some(EntryChangeKind::Modified)
    );
    assert_eq!(
        map_event_kind(EventKind::Modify(ModifyKind::Name(RenameMode::Any))),
        Some(EntryChangeKind::Renamed)
    );
    assert_eq!(map_event_kind(EventKind::Access(AccessKind::Any)), None);
    assert_eq!(map_event_kind(EventKind::Any), None);
    assert_eq!(map_event_kind(EventKind::Other), None);
}

#[test]
fn apply_debounced_events_emits_parent_and_skips_unmapped() {
    let mut payloads = Vec::new();
    apply_debounced_events(
        r"C:\watched",
        [
            EventKind::Create(CreateKind::Any),
            EventKind::Access(AccessKind::Any),
            EventKind::Remove(RemoveKind::Any),
        ],
        |payload| payloads.push(payload),
    );

    assert_eq!(payloads.len(), 2);
    assert_eq!(payloads[0].parent, r"C:\watched");
    assert_eq!(payloads[0].kind, EntryChangeKind::Created);
    assert_eq!(payloads[1].parent, r"C:\watched");
    assert_eq!(payloads[1].kind, EntryChangeKind::Deleted);
}

#[test]
fn watch_recursive_true_returns_recursive_not_supported() {
    let mut registry = WatchMap::new();
    let result = start_watch(&mut registry, r"C:\tmp", true, |_| {});
    assert!(
        matches!(result, Err(WatchError::RecursiveNotSupported)),
        "recursive watch must fail before starting a watcher, got {result:?}"
    );
    assert!(
        registry.is_empty(),
        "recursive rejection must not insert a watcher"
    );
}

#[test]
fn watch_and_unwatch_are_idempotent() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().to_string_lossy().into_owned();
    let mut registry = WatchMap::new();

    start_watch(&mut registry, &path, false, |_| {}).expect("first watch");
    start_watch(&mut registry, &path, false, |_| {}).expect("second watch is idempotent");
    assert_eq!(
        registry.len(),
        1,
        "duplicate watch must not leak a second watcher"
    );

    stop_watch(&mut registry, &path).expect("first unwatch");
    stop_watch(&mut registry, &path).expect("second unwatch is idempotent");
    assert!(registry.is_empty(), "unwatch must drop the watcher");
}

#[test]
fn watch_temp_dir_emits_created_when_file_appears() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().to_string_lossy().into_owned();
    let (tx, rx) = mpsc::channel();
    let mut registry = WatchMap::new();

    start_watch(&mut registry, &path, false, move |payload| {
        let _ = tx.send(payload);
    })
    .expect("watch temp dir");

    std::fs::write(dir.path().join("created.txt"), b"hi").expect("create file");

    let payload = rx
        .recv_timeout(Duration::from_secs(3))
        .expect("notify should emit within 3s after creating a file");
    assert_eq!(
        std::path::Path::new(&payload.parent),
        dir.path(),
        "parent must be the watched directory"
    );
    assert_eq!(payload.kind, EntryChangeKind::Created);

    stop_watch(&mut registry, &path).expect("unwatch");
}

#[test]
fn entry_changed_payload_serializes_lowercase_kinds() {
    use gencore_fs::EntryChangedPayload;

    for (kind, expected) in [
        (EntryChangeKind::Created, "created"),
        (EntryChangeKind::Deleted, "deleted"),
        (EntryChangeKind::Modified, "modified"),
        (EntryChangeKind::Renamed, "renamed"),
    ] {
        let json = serde_json::to_value(EntryChangedPayload {
            parent: r"C:\watched".into(),
            kind,
        })
        .expect("serialize payload");
        assert_eq!(
            json,
            serde_json::json!({ "parent": r"C:\watched", "kind": expected })
        );
    }
}

#[test]
fn unwatch_args_reject_unknown_fields() {
    let json = serde_json::json!({ "path": "/tmp", "unexpected": true });
    let parsed: Result<UnwatchArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}
