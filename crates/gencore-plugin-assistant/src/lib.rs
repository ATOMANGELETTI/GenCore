//! Gemini Assistant plugin for GenCore.

mod modules;

pub use modules::agent::{
    ConfirmOutcome, TurnResult, confirm_tool, continue_turn, finish_turn, prepare_resume,
    prepare_turn, reject_tool, resume_turn, send_turn,
};
pub use modules::assistant::{
    ASSISTANT_ERROR_EVENT, ASSISTANT_TOKEN_EVENT, ASSISTANT_TURN_EVENT, ASSISTANT_UI_ACTION_EVENT,
    ActionIdArgs, AgentSettingsDto, AssistantErrorPayload, AssistantTokenPayload,
    AssistantTurnPayload, AssistantUiActionPayload, ConversationIdArgs, FilesSelectionArgs,
    ListMessagesResult, SendMessageArgs, SendMessageResult, SetAgentSettingsArgs, SetApiKeyArgs,
    SnapshotArgs, SnapshotTabArgs, begin_turn, cancel_active_turn, cancel_turn, clear_api_key,
    confirm_action, create_conversation, delete_conversation, get_agent_settings,
    is_turn_cancelled, list_conversations, list_messages, reject_action, send_message,
    set_agent_settings, set_api_key, take_turn_cancelled,
};
pub use modules::error::AssistantError;
pub use modules::gemini::{
    GeminiContent, GeminiError, GeminiEvent, GeminiFunctionCall, GeminiFunctionResponse,
    GeminiPart, GeminiRequest, GeminiTransport, ReqwestTransport, ScriptedTransport,
    function_declarations, parse_sse_data, read_sse_events,
};
#[cfg(windows)]
pub use modules::secrets::DpapiProtector;
pub use modules::secrets::{
    ALLOWED_MODELS, DEFAULT_CONTEXT_LINES, DEFAULT_MODEL, IdentityProtector, SecretProtector,
    SecretsError, clamp_context_lines, parse_model,
};
pub use modules::store::{
    AssistantStore, Conversation, Message, Snapshot, StoreError, ToolCall, resolve_data_dir,
    seed_app_facts, sqlite_path,
};
pub use modules::tools::UiAction;

use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};

/// Identifier this plugin is registered under with [`tauri::Builder::plugin`].
pub const PLUGIN_ID: &str = "gencore-assistant";

/// Initializes the `gencore-assistant` plugin.
///
/// Seeds the SQLite store's `app_facts` on setup (idempotent: an `UPSERT`
/// per fact) so the turn loop's system prompt is populated from the first
/// conversation onward. Register this plugin after `gencore_pty::init()` —
/// `confirm_action` reads the PTY plugin's managed `SessionMap` state.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_ID)
        .invoke_handler(tauri::generate_handler![
            list_conversations,
            create_conversation,
            delete_conversation,
            list_messages,
            send_message,
            cancel_turn,
            confirm_action,
            reject_action,
            get_agent_settings,
            set_agent_settings,
            set_api_key,
            clear_api_key,
        ])
        .setup(|_app, _api| {
            let exe = std::env::current_exe()?;
            let exe_parent = exe.parent().ok_or(StoreError::DataDir)?;
            let data_dir = resolve_data_dir(exe_parent);
            let store = AssistantStore::open(&sqlite_path(&data_dir))?;
            seed_app_facts(&store)?;
            Ok(())
        })
        .build()
}
