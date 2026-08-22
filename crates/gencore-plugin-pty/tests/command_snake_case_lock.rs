//! Source lock: `write` / `resize` / `close` must keep `rename_all = "snake_case"`.
//!
//! Tauri's `#[tauri::command]` defaults argument keys to camelCase. The JS
//! wrappers send the literal `session_id` key. Dropping this attribute silently
//! breaks every write, including xterm's CPR reply to ConPTY `ESC[6n`.

use std::fs;
use std::path::PathBuf;

const SNAKE_CASE_COMMAND: &str = "#[tauri::command(rename_all = \"snake_case\")]";

fn read_src(rel: &str) -> String {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(rel);
    fs::read_to_string(&path).unwrap_or_else(|err| panic!("read {}: {err}", path.display()))
}

fn assert_session_id_command_uses_snake_case(source: &str, path: &str, fn_name: &str) {
    let sig = format!("pub async fn {fn_name}(");
    let start = source
        .find(&sig)
        .unwrap_or_else(|| panic!("{path}: missing `{sig}`"));
    let signature_end = source[start..]
        .find('{')
        .map(|offset| start + offset)
        .unwrap_or_else(|| panic!("{path}: `{fn_name}` has no body"));
    let signature = &source[start..signature_end];
    assert!(
        signature.contains("session_id"),
        "{path}: `{fn_name}` must take `session_id`"
    );

    let prelude = &source[start.saturating_sub(512)..start];
    assert!(
        prelude.contains(SNAKE_CASE_COMMAND),
        "{path}: `{fn_name}` must be annotated with `{SNAKE_CASE_COMMAND}` so IPC accepts the JS `session_id` key"
    );
}

#[test]
fn write_resize_close_keep_snake_case_rename_on_session_id() {
    assert_session_id_command_uses_snake_case(
        &read_src("src/modules/io/io_api.rs"),
        "src/modules/io/io_api.rs",
        "write",
    );
    assert_session_id_command_uses_snake_case(
        &read_src("src/modules/resize/resize_api.rs"),
        "src/modules/resize/resize_api.rs",
        "resize",
    );
    assert_session_id_command_uses_snake_case(
        &read_src("src/modules/session/session_api.rs"),
        "src/modules/session/session_api.rs",
        "close",
    );
}
