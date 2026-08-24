use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum CommitError {
    #[error("failed to open git repository at '{0}': {1}")]
    RepoOpenFailed(String, String),
    #[error("failed to create commit: {0}")]
    CommitFailed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommitResult {
    pub id: String,
    pub short_id: String,
    pub summary: String,
}
