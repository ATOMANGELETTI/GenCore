//! Shape and source-lock tests for the `assistant` module's IPC surface.
//!
//! The `#[tauri::command]` functions themselves need a live `AppHandle` /
//! `State`, so — like `gencore-pty`'s `stub_commands.rs` and
//! `command_snake_case_lock.rs` — these tests cover the `deny_unknown_fields`
//! argument shapes and the `rename_all = "snake_case"` lock that keeps
//! multi-word JS payload keys (`conversation_id`, `context_lines`, …)
//! matching the literal keys `ipc.assistant.ts` sends.

use std::fs;
use std::path::PathBuf;

use gencore_assistant::{
    ASSISTANT_ERROR_EVENT, ASSISTANT_TOKEN_EVENT, ASSISTANT_TURN_EVENT, ASSISTANT_UI_ACTION_EVENT,
    ActionIdArgs, ConversationIdArgs, FilesSelectionArgs, SendMessageArgs, SetAgentSettingsArgs,
    SetApiKeyArgs, SnapshotTabArgs,
};

fn valid_snapshot_json() -> serde_json::Value {
    serde_json::json!({
        "active_tab_id": "tab-1",
        "active_session_id": "session-1",
        "cwd": "C:\\work",
        "output_excerpt": "PS>",
        "tabs": [{ "id": "tab-1", "name": "pwsh", "cwd": "C:\\work", "pinned": false }],
        "files_selection": { "path": "C:\\work\\file.txt", "kind": "file" },
    })
}

#[test]
fn conversation_id_args_reject_unknown_fields() {
    let json = serde_json::json!({ "conversation_id": "c1", "extra": true });
    let parsed: Result<ConversationIdArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn conversation_id_args_accept_known_shape() {
    let parsed: ConversationIdArgs =
        serde_json::from_value(serde_json::json!({ "conversation_id": "c1" })).unwrap();
    assert_eq!(parsed.conversation_id, "c1");
}

#[test]
fn action_id_args_reject_unknown_fields() {
    let json = serde_json::json!({ "id": "tool-1", "extra": true });
    let parsed: Result<ActionIdArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn action_id_args_accept_known_shape() {
    let parsed: ActionIdArgs =
        serde_json::from_value(serde_json::json!({ "id": "tool-1" })).unwrap();
    assert_eq!(parsed.id, "tool-1");
}

#[test]
fn set_api_key_args_reject_unknown_fields() {
    let json = serde_json::json!({ "key": "secret", "extra": true });
    let parsed: Result<SetApiKeyArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn set_agent_settings_args_accept_empty_patch() {
    let parsed: SetAgentSettingsArgs = serde_json::from_value(serde_json::json!({})).unwrap();
    assert!(parsed.model.is_none());
    assert!(parsed.context_lines.is_none());
}

#[test]
fn set_agent_settings_args_reject_unknown_fields() {
    let json = serde_json::json!({ "model": "gemini-3.7-flash", "extra": true });
    let parsed: Result<SetAgentSettingsArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn snapshot_tab_args_reject_unknown_fields() {
    let json = serde_json::json!({ "id": "tab-1", "pinned": true, "extra": true });
    let parsed: Result<SnapshotTabArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn snapshot_tab_args_accept_id_and_pinned_only() {
    let parsed: SnapshotTabArgs =
        serde_json::from_value(serde_json::json!({ "id": "tab-1", "pinned": true })).unwrap();
    assert_eq!(parsed.id, "tab-1");
    assert!(parsed.name.is_none());
    assert!(parsed.cwd.is_none());
}

#[test]
fn files_selection_args_require_path_and_kind() {
    let json = serde_json::json!({ "path": "C:\\a" });
    let parsed: Result<FilesSelectionArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn send_message_args_accept_full_snapshot() {
    let json = serde_json::json!({
        "conversation_id": "c1",
        "text": "list files",
        "snapshot": valid_snapshot_json(),
    });
    let parsed: SendMessageArgs = serde_json::from_value(json).unwrap();
    assert_eq!(parsed.conversation_id, "c1");
    assert_eq!(parsed.snapshot.tabs.len(), 1);
    assert_eq!(
        parsed.snapshot.files_selection.unwrap().path,
        "C:\\work\\file.txt"
    );
}

#[test]
fn send_message_args_accept_snapshot_without_optional_fields() {
    let json = serde_json::json!({
        "conversation_id": "c1",
        "text": "hi",
        "snapshot": {
            "active_tab_id": "tab-1",
            "output_excerpt": "",
            "tabs": [{ "id": "tab-1", "pinned": true }],
        },
    });
    let parsed: SendMessageArgs = serde_json::from_value(json).unwrap();
    assert!(parsed.snapshot.active_session_id.is_none());
    assert!(parsed.snapshot.cwd.is_none());
    assert!(parsed.snapshot.files_selection.is_none());
}

#[test]
fn send_message_args_reject_unknown_top_level_field() {
    let json = serde_json::json!({
        "conversation_id": "c1",
        "text": "hi",
        "snapshot": valid_snapshot_json(),
        "extra": true,
    });
    let parsed: Result<SendMessageArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn send_message_args_reject_unknown_snapshot_field() {
    let mut snapshot = valid_snapshot_json();
    snapshot["injected"] = serde_json::json!("strip-me");
    let json = serde_json::json!({ "conversation_id": "c1", "text": "hi", "snapshot": snapshot });
    let parsed: Result<SendMessageArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn send_message_args_reject_malformed_tab_entry() {
    let mut snapshot = valid_snapshot_json();
    snapshot["tabs"] = serde_json::json!([{ "id": "tab-1" }]);
    let json = serde_json::json!({ "conversation_id": "c1", "text": "hi", "snapshot": snapshot });
    let parsed: Result<SendMessageArgs, _> = serde_json::from_value(json);
    assert!(parsed.is_err());
}

#[test]
fn assistant_event_names_match_the_isolation_allowlist() {
    assert_eq!(ASSISTANT_TOKEN_EVENT, "gencore-assistant://token");
    assert_eq!(ASSISTANT_TURN_EVENT, "gencore-assistant://turn");
    assert_eq!(ASSISTANT_ERROR_EVENT, "gencore-assistant://error");
    assert_eq!(ASSISTANT_UI_ACTION_EVENT, "gencore-assistant://ui-action");
}

fn read_src(rel: &str) -> String {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(rel);
    fs::read_to_string(&path).unwrap_or_else(|err| panic!("read {}: {err}", path.display()))
}

/// `session_api::open`/`close` in `gencore-pty` set the same precedent: a
/// command whose flattened parameters include a multi-word name (here
/// `conversation_id` / `context_lines`) needs `rename_all = "snake_case"` or
/// Tauri's default camelCase mapping silently breaks the literal key
/// `ipc.assistant.ts` sends.
fn assert_command_uses_snake_case(source: &str, fn_name: &str) {
    let sig = format!("pub async fn {fn_name}");
    let start = source
        .find(&sig)
        .unwrap_or_else(|| panic!("missing `{sig}`"));
    let prelude = &source[start.saturating_sub(512)..start];
    assert!(
        prelude.contains("#[tauri::command(rename_all = \"snake_case\")]"),
        "`{fn_name}` must be annotated with `#[tauri::command(rename_all = \"snake_case\")]`"
    );
}

#[test]
fn multi_word_param_commands_use_snake_case_rename() {
    let source = read_src("src/modules/assistant/assistant_api.rs");
    for fn_name in [
        "delete_conversation",
        "list_messages",
        "send_message",
        "cancel_turn",
        "set_agent_settings",
    ] {
        assert_command_uses_snake_case(&source, fn_name);
    }
}

#[test]
fn twelve_commands_are_registered_in_the_invoke_handler() {
    let source = read_src("src/lib.rs");
    for cmd in [
        "list_conversations",
        "create_conversation",
        "delete_conversation",
        "list_messages",
        "send_message",
        "cancel_turn",
        "confirm_action",
        "reject_action",
        "get_agent_settings",
        "set_agent_settings",
        "set_api_key",
        "clear_api_key",
    ] {
        assert!(
            source.contains(&format!("{cmd},")) || source.contains(&format!("{cmd}\n")),
            "invoke_handler is missing `{cmd}`"
        );
    }
}
