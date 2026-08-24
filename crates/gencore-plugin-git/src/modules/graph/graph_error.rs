use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum GraphError {
    #[error("failed to open git repository at '{0}': {1}")]
    RepoOpenFailed(String, String),
    #[error("failed to query git log: {0}")]
    QueryFailed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommitNode {
    pub id: String,
    pub short_id: String,
    pub summary: String,
    pub author_name: String,
    pub author_email: String,
    pub timestamp: i64,
    pub parents: Vec<String>,
    pub refs: Vec<String>,
}
