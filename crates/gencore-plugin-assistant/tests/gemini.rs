use gencore_assistant::{GeminiEvent, function_declarations, parse_sse_data};

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
