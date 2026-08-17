use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use notify_debouncer_full::notify::{RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{DebounceEventResult, Debouncer, RecommendedCache, new_debouncer};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Runtime, State};

use super::watch_error::{WatchError, map_notify_error};
use crate::modules::path_util::normalize_path;

pub use notify_debouncer_full::notify::event::{
    AccessKind, CreateKind, DataChange, EventKind, ModifyKind, RemoveKind, RenameMode,
};

const ENTRY_CHANGED_EVENT: &str = "gencore-fs://entry-changed";

/// Arguments for watching a path for filesystem changes.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct WatchArgs {
    /// Path to watch.
    pub path: String,
    /// Whether to watch subdirectories recursively.
    pub recursive: bool,
}

/// Kind of a filesystem change emitted to the UI.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum EntryChangeKind {
    /// A file or directory was created.
    Created,
    /// A file or directory was deleted.
    Deleted,
    /// A file or directory was modified.
    Modified,
    /// A file or directory was renamed.
    Renamed,
}

/// Payload for the `gencore-fs://entry-changed` event.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct EntryChangedPayload {
    /// Dunce-normalized watched directory (the path passed to [`start_watch`]).
    pub parent: String,
    /// Classified change kind.
    pub kind: EntryChangeKind,
}

/// Debouncer stored per watched path.
pub type FsDebouncer = Debouncer<RecommendedWatcher, RecommendedCache>;

/// Watchers keyed by dunce-normalized path.
pub type WatchMap = HashMap<String, FsDebouncer>;

/// Maps a notify event kind onto the UI payload kind.
///
/// Access, catch-all, and other events are ignored.
pub fn map_event_kind(kind: EventKind) -> Option<EntryChangeKind> {
    match kind {
        EventKind::Create(_) => Some(EntryChangeKind::Created),
        EventKind::Remove(_) => Some(EntryChangeKind::Deleted),
        EventKind::Modify(ModifyKind::Name(_)) => Some(EntryChangeKind::Renamed),
        EventKind::Modify(_) => Some(EntryChangeKind::Modified),
        EventKind::Access(_) | EventKind::Any | EventKind::Other => None,
    }
}

/// Emits one payload per mapped event, using `parent` as the watched directory.
pub fn apply_debounced_events(
    parent: &str,
    kinds: impl IntoIterator<Item = EventKind>,
    mut emit: impl FnMut(EntryChangedPayload),
) {
    for event_kind in kinds {
        if let Some(kind) = map_event_kind(event_kind) {
            emit(EntryChangedPayload {
                parent: parent.to_owned(),
                kind,
            });
        }
    }
}

/// Drops a dead watcher after a debounce error and asks the UI to re-list.
pub fn handle_debounce_error(
    registry: &Arc<Mutex<WatchMap>>,
    parent: &str,
    mut emit: impl FnMut(EntryChangedPayload),
) {
    let key = normalize_path(parent);
    registry.lock().expect("watch registry mutex").remove(&key);
    emit(EntryChangedPayload {
        parent: key,
        kind: EntryChangeKind::Modified,
    });
}

/// Starts a non-recursive watch on `path`.
///
/// Watching an already-watched path is a no-op. `recursive: true` is rejected
/// before a watcher is created.
pub fn start_watch<F>(
    registry: &Arc<Mutex<WatchMap>>,
    path: &str,
    recursive: bool,
    on_event: F,
) -> Result<(), WatchError>
where
    F: Fn(EntryChangedPayload) + Send + 'static,
{
    if recursive {
        return Err(WatchError::RecursiveNotSupported);
    }

    let key = normalize_path(path);
    let mut map = registry.lock().expect("watch registry mutex");
    if map.contains_key(&key) {
        return Ok(());
    }

    let parent = key.clone();
    let registry_for_handler = Arc::clone(registry);
    let mut debouncer = new_debouncer(
        Duration::from_millis(250),
        None,
        move |result: DebounceEventResult| match result {
            Ok(events) => {
                apply_debounced_events(&parent, events.iter().map(|event| event.kind), &on_event);
            }
            Err(_) => {
                handle_debounce_error(&registry_for_handler, &parent, &on_event);
            }
        },
    )
    .map_err(map_notify_error)?;

    debouncer
        .watch(Path::new(&key), RecursiveMode::NonRecursive)
        .map_err(map_notify_error)?;

    map.insert(key, debouncer);
    Ok(())
}

/// Watches a directory for changes and emits `gencore-fs://entry-changed`.
#[tauri::command]
pub async fn watch<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, Arc<Mutex<WatchMap>>>,
    path: String,
    recursive: bool,
) -> Result<(), WatchError> {
    start_watch(&state, &path, recursive, move |payload| {
        let _ = app.emit(ENTRY_CHANGED_EVENT, payload);
    })
}
