use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum DialogError {
    #[error("failed to open folder dialog: {0}")]
    DialogFailed(String),
}
