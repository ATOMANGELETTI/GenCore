use std::future::Future;
use std::pin::pin;
use std::task::{Context, Poll, Waker};

use gencore_pty::{
    CloseArgs, IoError, OpenArgs, ResizeArgs, ResizeError, SessionError, WriteArgs, close, open,
    resize, write,
};

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
fn open_returns_not_implemented() {
    let result = block_on(open(OpenArgs { cols: 80, rows: 24 }));
    assert!(matches!(result, Err(SessionError::NotImplemented)));
}

#[test]
fn close_returns_not_implemented() {
    let result = block_on(close(CloseArgs {
        session_id: "session-1".into(),
    }));
    assert!(matches!(result, Err(SessionError::NotImplemented)));
}

#[test]
fn write_returns_not_implemented() {
    let result = block_on(write(WriteArgs {
        session_id: "session-1".into(),
        data: "hello".into(),
    }));
    assert!(matches!(result, Err(IoError::NotImplemented)));
}

#[test]
fn resize_returns_not_implemented() {
    let result = block_on(resize(ResizeArgs {
        session_id: "session-1".into(),
        cols: 100,
        rows: 40,
    }));
    assert!(matches!(result, Err(ResizeError::NotImplemented)));
}

#[test]
fn open_args_reject_unknown_fields() {
    let json = serde_json::json!({ "cols": 80, "rows": 24, "unexpected": true });
    let parsed: Result<OpenArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn write_args_reject_unknown_fields() {
    let json = serde_json::json!({ "session_id": "session-1", "data": "hi", "unexpected": true });
    let parsed: Result<WriteArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}
