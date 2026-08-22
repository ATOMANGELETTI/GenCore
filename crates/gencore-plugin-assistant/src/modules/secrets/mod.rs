pub mod secrets_api;
pub mod secrets_error;
pub mod secrets_protector;

pub use secrets_api::{
    ALLOWED_MODELS, DEFAULT_CONTEXT_LINES, DEFAULT_MODEL, clamp_context_lines, parse_model,
};
pub use secrets_error::SecretsError;
pub use secrets_protector::{IdentityProtector, SecretProtector};

#[cfg(windows)]
pub use secrets_protector::DpapiProtector;
