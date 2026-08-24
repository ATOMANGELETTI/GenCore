use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum StashError {
    #[error("failed to open git repository at '{0}': {1}")]
    RepoOpenFailed(String, String),
    #[error("stash operation failed: {0}")]
    OperationFailed(String),
}
