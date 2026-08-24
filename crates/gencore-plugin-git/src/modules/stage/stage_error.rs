use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum StageError {
    #[error("failed to open git repository at '{0}': {1}")]
    RepoOpenFailed(String, String),
    #[error("failed to stage file '{0}': {1}")]
    StageFailed(String, String),
    #[error("failed to unstage file '{0}': {1}")]
    UnstageFailed(String, String),
    #[error("failed to discard changes in '{0}': {1}")]
    DiscardFailed(String, String),
}
