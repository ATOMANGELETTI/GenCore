//! Source lock: `rename` / `copy` / `move_paths` must keep `rename_all = "snake_case"`.
//!
//! Tauri's `#[tauri::command]` defaults argument keys to camelCase. The JS
//! wrappers send the literal `new_name` / `destination_dir` keys. Dropping
//! this attribute silently breaks every rename, copy, and cut-paste.

use std::fs;
use std::path::PathBuf;

const SNAKE_CASE_COMMAND: &str = "#[tauri::command(rename_all = \"snake_case\")]";

fn read_src(rel: &str) -> String {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(rel);
    fs::read_to_string(&path).unwrap_or_else(|err| panic!("read {}: {err}", path.display()))
}

fn assert_command_uses_snake_case(source: &str, path: &str, fn_name: &str) {
    let sig_plain = format!("pub async fn {fn_name}(");
    let start = source
        .find(&sig_plain)
        .unwrap_or_else(|| panic!("{path}: missing `pub async fn {fn_name}`"));
    let prelude = &source[start.saturating_sub(512)..start];
    assert!(
        prelude.contains(SNAKE_CASE_COMMAND),
        "{path}: `{fn_name}` must be annotated with `{SNAKE_CASE_COMMAND}` so IPC accepts snake_case argument keys"
    );
}

#[test]
fn rename_copy_move_paths_keep_snake_case_rename() {
    assert_command_uses_snake_case(
        &read_src("src/modules/rename/rename_api.rs"),
        "src/modules/rename/rename_api.rs",
        "rename",
    );
    assert_command_uses_snake_case(
        &read_src("src/modules/copy/copy_api.rs"),
        "src/modules/copy/copy_api.rs",
        "copy",
    );
    assert_command_uses_snake_case(
        &read_src("src/modules/move_paths/move_paths_api.rs"),
        "src/modules/move_paths/move_paths_api.rs",
        "move_paths",
    );
}
