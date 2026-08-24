//! Source lock: all `gencore-plugin-git` commands must keep `rename_all = "snake_case"`.
//!
//! Tauri's `#[tauri::command]` defaults argument keys to camelCase. The GenCore JS
//! wrappers and isolation hook send `snake_case` keys (e.g. `repo_path`, `file_path`).
//! Dropping this attribute causes deserialization failures with "missing required key".

use std::fs;
use std::path::PathBuf;

const SNAKE_CASE_COMMAND: &str = "#[tauri::command(rename_all = \"snake_case\")]";

fn read_src(rel: &str) -> String {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(rel);
    fs::read_to_string(&path).unwrap_or_else(|err| panic!("read {}: {err}", path.display()))
}

fn assert_command_uses_snake_case(source: &str, path: &str, fn_name: &str) {
    let sig_plain = format!("pub fn {fn_name}(");
    let sig_async = format!("pub async fn {fn_name}(");
    let start = source
        .find(&sig_plain)
        .or_else(|| source.find(&sig_async))
        .unwrap_or_else(|| panic!("{path}: missing `pub (async) fn {fn_name}`"));
    let prelude = &source[start.saturating_sub(512)..start];
    assert!(
        prelude.contains(SNAKE_CASE_COMMAND),
        "{path}: `{fn_name}` must be annotated with `{SNAKE_CASE_COMMAND}` so IPC accepts snake_case argument keys"
    );
}

#[test]
fn all_git_commands_keep_snake_case_rename() {
    let status_src = read_src("src/modules/status/status_api.rs");
    assert_command_uses_snake_case(&status_src, "status_api.rs", "git_get_status");

    let stage_src = read_src("src/modules/stage/stage_api.rs");
    assert_command_uses_snake_case(&stage_src, "stage_api.rs", "git_stage_file");
    assert_command_uses_snake_case(&stage_src, "stage_api.rs", "git_unstage_file");
    assert_command_uses_snake_case(&stage_src, "stage_api.rs", "git_stage_all");
    assert_command_uses_snake_case(&stage_src, "stage_api.rs", "git_unstage_all");
    assert_command_uses_snake_case(&stage_src, "stage_api.rs", "git_discard_changes");

    let commit_src = read_src("src/modules/commit/commit_api.rs");
    assert_command_uses_snake_case(&commit_src, "commit_api.rs", "git_commit");

    let init_src = read_src("src/modules/init/init_api.rs");
    assert_command_uses_snake_case(&init_src, "init_api.rs", "git_init_repo");

    let diff_src = read_src("src/modules/diff/diff_api.rs");
    assert_command_uses_snake_case(&diff_src, "diff_api.rs", "git_get_diff");

    let graph_src = read_src("src/modules/graph/graph_api.rs");
    assert_command_uses_snake_case(&graph_src, "graph_api.rs", "git_get_log");

    let branch_src = read_src("src/modules/branch/branch_api.rs");
    assert_command_uses_snake_case(&branch_src, "branch_api.rs", "git_list_branches");
    assert_command_uses_snake_case(&branch_src, "branch_api.rs", "git_checkout_branch");
    assert_command_uses_snake_case(&branch_src, "branch_api.rs", "git_create_branch");

    let stash_src = read_src("src/modules/stash/stash_api.rs");
    assert_command_uses_snake_case(&stash_src, "stash_api.rs", "git_stash_save");
    assert_command_uses_snake_case(&stash_src, "stash_api.rs", "git_stash_pop");

    let dialog_src = read_src("src/modules/dialog/dialog_api.rs");
    assert_command_uses_snake_case(&dialog_src, "dialog_api.rs", "git_pick_folder");
}
