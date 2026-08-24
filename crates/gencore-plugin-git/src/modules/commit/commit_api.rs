use super::commit_error::{CommitError, GitCommitResult};
use std::path::Path;

#[tauri::command(rename_all = "snake_case")]
pub fn git_commit(
    repo_path: String,
    message: String,
    _amend: bool,
) -> Result<GitCommitResult, CommitError> {
    let p = Path::new(&repo_path);
    let repo =
        gix::open(p).map_err(|e| CommitError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;

    let head_commit = repo.head_commit().ok();
    let base_tree_id = head_commit
        .as_ref()
        .and_then(|h| h.tree_id().ok())
        .map(|id| id.detach())
        .unwrap_or_else(|| gix::hash::ObjectId::empty_tree(repo.object_hash()));

    let tree_id = if let Ok(index) = repo.open_index() {
        let mut editor = repo
            .edit_tree(base_tree_id)
            .map_err(|e| CommitError::CommitFailed(e.to_string()))?;
        for entry in index.entries() {
            let path = entry.path(&index);
            let mode = entry.mode;
            let kind = match mode {
                gix::index::entry::Mode::FILE => gix::object::tree::EntryKind::Blob,
                gix::index::entry::Mode::FILE_EXECUTABLE => {
                    gix::object::tree::EntryKind::BlobExecutable
                }
                gix::index::entry::Mode::SYMLINK => gix::object::tree::EntryKind::Link,
                _ => gix::object::tree::EntryKind::Blob,
            };
            editor
                .upsert(path, kind, entry.id)
                .map_err(|e| CommitError::CommitFailed(e.to_string()))?;
        }
        editor
            .write()
            .map_err(|e| CommitError::CommitFailed(e.to_string()))?
            .detach()
    } else {
        base_tree_id
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
