use std::sync::{Arc, Mutex, mpsc};
use std::time::Duration;

use gencore_fs::{
    AccessKind, CreateKind, DataChange, EntryChangeKind, EventKind, ModifyKind, RemoveKind,
    RenameMode, UnwatchArgs, WatchArgs, WatchError, WatchMap, apply_debounced_events,
    handle_debounce_error, map_event_kind, start_watch, stop_watch,
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
    let registry = Arc::new(Mutex::new(WatchMap::new()));
    let result = start_watch(&registry, r"C:\tmp", true, |_| {});
    assert!(
        matches!(result, Err(WatchError::RecursiveNotSupported)),
        "recursive watch must fail before starting a watcher, got {result:?}"
    );
    assert!(
        registry.lock().expect("watch registry mutex").is_empty(),
        "recursive rejection must not insert a watcher"
    );
}

#[test]
fn watch_and_unwatch_are_idempotent() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().to_string_lossy().into_owned();
    let registry = Arc::new(Mutex::new(WatchMap::new()));

    start_watch(&registry, &path, false, |_| {}).expect("first watch");
    start_watch(&registry, &path, false, |_| {}).expect("second watch is idempotent");
    assert_eq!(
        registry.lock().expect("watch registry mutex").len(),
        1,
        "duplicate watch must not leak a second watcher"
    );

    stop_watch(&registry, &path).expect("first unwatch");
    stop_watch(&registry, &path).expect("second unwatch is idempotent");
    assert!(
        registry.lock().expect("watch registry mutex").is_empty(),
        "unwatch must drop the watcher"
    );
}

#[test]
fn watch_temp_dir_emits_created_when_file_appears() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().to_string_lossy().into_owned();
    let (tx, rx) = mpsc::channel();
    let registry = Arc::new(Mutex::new(WatchMap::new()));

    start_watch(&registry, &path, false, move |payload| {
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

    stop_watch(&registry, &path).expect("unwatch");
}

#[test]
fn debounce_err_drops_dead_watcher_so_rewatch_can_restart() {
    let dir = tempfile::tempdir().expect("temp dir");
    let path = dir.path().to_string_lossy().into_owned();
    let registry = Arc::new(Mutex::new(WatchMap::new()));
    let (tx, rx) = mpsc::channel();

    start_watch(&registry, &path, false, {
        let tx = tx.clone();
        move |payload| {
            let _ = tx.send(payload);
        }
    })
    .expect("watch");
    assert_eq!(
        registry.lock().expect("watch registry mutex").len(),
        1,
        "live watch must occupy the registry"
    );

    let key = registry
        .lock()
        .expect("watch registry mutex")
        .keys()
        .next()
        .expect("watched path")
        .clone();

    handle_debounce_error(&registry, &key, |payload| {
        let _ = tx.send(payload);
    });

    assert!(
        registry.lock().expect("watch registry mutex").is_empty(),
        "debounce Err must drop the dead watcher so later watch can restart"
    );

    let payload = rx
        .try_recv()
        .expect("debounce Err must emit so the UI re-lists");
    assert_eq!(payload.parent, key);
    assert_eq!(payload.kind, EntryChangeKind::Modified);

    start_watch(&registry, &path, false, |_| {}).expect("rewatch after debounce error");
    assert_eq!(
        registry.lock().expect("watch registry mutex").len(),
        1,
        "later watch of the same path must insert a new watcher"
    );

    stop_watch(&registry, &path).expect("unwatch");
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

#[test]
fn watch_args_reject_unknown_fields() {
    let json = serde_json::json!({ "path": "/tmp", "recursive": true, "unexpected": true });
    let parsed: Result<WatchArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}
