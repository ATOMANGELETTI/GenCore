//! Gemini Assistant plugin for GenCore.

mod modules;

pub use modules::error::AssistantError;
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

use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};

/// Identifier this plugin is registered under with [`tauri::Builder::plugin`].
pub const PLUGIN_ID: &str = "gencore-assistant";

/// Initializes the `gencore-assistant` plugin.
///
/// No permissions are allowed by default; see `permissions/default.toml`.
/// Commands stay unregistered until a later task wires the invoke handler.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_ID).build()
}
