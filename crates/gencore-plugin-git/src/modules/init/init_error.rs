use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum InitError {
    #[error("failed to initialize git repository: {0}")]
    InitFailed(String),
}
