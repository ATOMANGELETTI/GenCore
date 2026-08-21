use gencore_pty::{CloseArgs, OpenArgs, ResizeArgs, WriteArgs};

#[test]
fn open_args_reject_unknown_fields() {
    let json = serde_json::json!({ "cols": 80, "rows": 24, "unexpected": true });
    let parsed: Result<OpenArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn open_args_accept_optional_cwd_and_theme() {
    let parsed: OpenArgs = serde_json::from_value(serde_json::json!({
        "cols": 80,
        "rows": 24,
        "cwd": "C:\\Users\\test",
        "theme": "snow-storm"
    }))
    .unwrap();
    assert_eq!(parsed.cols, 80);
    assert_eq!(parsed.rows, 24);
    assert_eq!(parsed.cwd.as_deref(), Some("C:\\Users\\test"));
    assert_eq!(parsed.theme.as_deref(), Some("snow-storm"));
}

#[test]
fn write_args_reject_unknown_fields() {
    let json = serde_json::json!({ "session_id": "session-1", "data": "hi", "unexpected": true });
    let parsed: Result<WriteArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn resize_args_reject_unknown_fields() {
    let json = serde_json::json!({
        "session_id": "session-1",
        "cols": 100,
        "rows": 40,
        "unexpected": true
    });
    let parsed: Result<ResizeArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn close_args_reject_unknown_fields() {
    let json = serde_json::json!({ "session_id": "session-1", "unexpected": true });
    let parsed: Result<CloseArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}
