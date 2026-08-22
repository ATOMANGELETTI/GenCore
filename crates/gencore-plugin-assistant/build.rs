const COMMANDS: &[&str] = &[
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
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
