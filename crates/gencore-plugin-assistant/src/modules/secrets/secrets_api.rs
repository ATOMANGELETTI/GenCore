use crate::modules::error::AssistantError;

/// Config default: Gemini 3.7 Flash.
pub const DEFAULT_MODEL: &str = "gemini-3.7-flash";

/// Config default: last 80 terminal lines with each send.
pub const DEFAULT_CONTEXT_LINES: u32 = 80;

/// Exact Gemini Developer API model IDs offered in Config.
pub const ALLOWED_MODELS: &[&str] = &[
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-pro-preview",
];

/// Accepts only [`ALLOWED_MODELS`]. Returns the allowlist entry, not the input.
pub fn parse_model(model: &str) -> Result<&str, AssistantError> {
    ALLOWED_MODELS
        .iter()
        .copied()
        .find(|allowed| *allowed == model)
        .ok_or(AssistantError::InvalidModel)
}

/// `Some` only when `n` is in `20..=200`.
pub fn clamp_context_lines(n: i64) -> Option<u32> {
    u32::try_from(n)
        .ok()
        .filter(|value| (20..=200).contains(value))
}
