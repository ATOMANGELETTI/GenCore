use super::commit_error::{CommitError, GitCommitResult};
use std::path::Path;

#[tauri::command]
pub fn git_commit(
    repo_path: String,
    message: String,
    _amend: bool,
) -> Result<GitCommitResult, CommitError> {
    let p = Path::new(&repo_path);
    let repo =
        gix::open(p).map_err(|e| CommitError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;

    let head_commit = repo.head_commit().ok();
    let tree_id = if let Some(ref head) = head_commit {
        head.tree_id()
            .map_err(|e| CommitError::CommitFailed(e.to_string()))?
            .detach()
    } else {
        repo.empty_tree().id().detach()
    };

    let parents: Vec<gix::ObjectId> = head_commit
        .map(|c| vec![c.id().detach()])
        .unwrap_or_default();

    let commit_id = repo
        .commit("HEAD", message.as_str(), tree_id, parents)
        .map_err(|e| CommitError::CommitFailed(e.to_string()))?;

    let short_id = commit_id.to_hex_with_len(7).to_string();

    Ok(GitCommitResult {
        id: commit_id.to_string(),
        short_id,
        summary: message.lines().next().unwrap_or("").to_string(),
    })
}
