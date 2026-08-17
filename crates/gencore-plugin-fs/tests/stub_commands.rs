use std::future::Future;
use std::pin::pin;
use std::task::{Context, Poll, Waker};

use gencore_fs::{ListArgs, StatArgs, StatError, WatchArgs, stat};

/// Minimal, dependency-free executor for driving the stub commands' futures
/// to completion in tests. All stub commands resolve on first poll, so a
/// no-op waker is sufficient.
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

#[test]
fn stat_returns_not_implemented() {
    let result = block_on(stat(StatArgs {
        path: "/tmp/file.txt".into(),
    }));
    assert!(matches!(result, Err(StatError::NotImplemented)));
}

#[test]
fn list_args_reject_unknown_fields() {
    let json = serde_json::json!({ "path": "/tmp", "unexpected": true });
    let parsed: Result<ListArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn watch_args_reject_unknown_fields() {
    let json = serde_json::json!({ "path": "/tmp", "recursive": true, "unexpected": true });
    let parsed: Result<WatchArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}
