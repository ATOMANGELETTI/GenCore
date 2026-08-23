use std::cell::Cell;
use std::io::{BufReader, Cursor};

use gencore_assistant::{
    GeminiError, GeminiEvent, GeminiPart, function_declarations, parse_sse_data, read_sse_events,
};

#[test]
fn parse_text_delta() {
    let data = r#"{"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}"#;
    let events = parse_sse_data(data).unwrap();
    assert!(matches!(&events[0], GeminiEvent::Text(t) if t == "Hello"));
}

#[test]
fn parse_function_call_pty_write_has_data_only() {
    let data = r#"{"candidates":[{"content":{"parts":[{"functionCall":{"name":"pty_write","args":{"data":"Get-ChildItem"}}}]}}]}"#;
    let events = parse_sse_data(data).unwrap();
    match &events[0] {
        GeminiEvent::FunctionCall { name, args_json } => {
            assert_eq!(name, "pty_write");
            assert!(args_json.contains("Get-ChildItem"));
            assert!(!args_json.contains("session_id"));
        }
        other => panic!("{other:?}"),
    }
}

#[test]
fn declarations_do_not_let_model_set_session_id() {
    let decls = function_declarations().to_string();
    assert!(decls.contains("pty_write"));
    assert!(decls.contains("switch_tab"));
    assert!(decls.contains("reveal_in_files"));
    assert!(!decls.contains("session_id"));
}

#[test]
fn gemini_part_text_serializes_text_only() {
    let part = GeminiPart::text("hi");
    let json = serde_json::to_value(&part).unwrap();
    assert_eq!(json, serde_json::json!({ "text": "hi" }));
}

#[test]
fn gemini_part_function_call_serializes_camel_case_name_and_args() {
    let part = GeminiPart::function_call("pty_write", serde_json::json!({ "data": "whoami" }));
    let json = serde_json::to_value(&part).unwrap();
    assert_eq!(
        json,
        serde_json::json!({ "functionCall": { "name": "pty_write", "args": { "data": "whoami" } } })
    );
}

#[test]
fn gemini_part_function_response_serializes_camel_case_name_and_response() {
    let part = GeminiPart::function_response("pty_write", serde_json::json!({ "status": "ran" }));
    let json = serde_json::to_value(&part).unwrap();
    assert_eq!(
        json,
        serde_json::json!({ "functionResponse": { "name": "pty_write", "response": { "status": "ran" } } })
    );
}

/// `read_sse_events` is the incremental line reader `ReqwestTransport::generate`
/// delegates to; testing it against a mock `Cursor` reader (rather than a
/// live HTTP response) covers the cancel-mid-stream and per-event callback
/// behavior without a network dependency.
#[test]
fn read_sse_events_emits_each_text_event_and_returns_them_all() {
    let body = "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"a\"}]}}]}\n\
                data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"b\"}]}}]}\n\
                data: [DONE]\n";
    let reader = BufReader::new(Cursor::new(body.as_bytes()));
    let mut seen = Vec::new();
    let events = read_sse_events(reader, &mut |event| seen.push(event.clone()), &|| false).unwrap();

    assert_eq!(
        seen,
        vec![GeminiEvent::Text("a".into()), GeminiEvent::Text("b".into())]
    );
    assert_eq!(events, seen);
}

#[test]
fn read_sse_events_stops_and_returns_cancelled_once_the_flag_trips() {
    let body = "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"a\"}]}}]}\n\
                data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"b\"}]}}]}\n";
    let reader = BufReader::new(Cursor::new(body.as_bytes()));
    let checks = Cell::new(0);
    let is_cancelled = || {
        let n = checks.get();
        checks.set(n + 1);
        n >= 1
    };
    let mut seen = Vec::new();
    let err =
        read_sse_events(reader, &mut |event| seen.push(event.clone()), &is_cancelled).unwrap_err();

    assert!(matches!(err, GeminiError::Cancelled));
    assert_eq!(
        seen,
        vec![GeminiEvent::Text("a".into())],
        "cancellation must stop before the second line is parsed or emitted"
    );
}
