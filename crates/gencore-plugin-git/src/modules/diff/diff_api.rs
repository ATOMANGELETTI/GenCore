use super::diff_error::{DiffError, GitDiffResult};
use std::path::Path;

#[tauri::command]
pub fn git_get_diff(repo_path: String, file_path: String) -> Result<GitDiffResult, DiffError> {
    let p = Path::new(&repo_path);
    let repo =
        gix::open(p).map_err(|e| DiffError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;

    let full_path = Path::new(&file_path);
    let full = if full_path.is_absolute() {
        full_path.to_path_buf()
    } else {
        p.join(full_path)
    };

    let working_content = std::fs::read_to_string(&full).unwrap_or_default();
    let mut head_content = String::new();

    if let Ok(head_commit) = repo.head_commit()
        && let Ok(tree) = head_commit.tree()
    {
        let rel = if full_path.is_absolute() {
            full_path.strip_prefix(p).unwrap_or(full_path)
        } else {
            full_path
        };
        if let Ok(Some(entry)) = tree.lookup_entry_by_path(rel)
            && let Ok(obj) = entry.object()
        {
            head_content = String::from_utf8_lossy(&obj.data).to_string();
        }
    }

    Ok(GitDiffResult {
        path: file_path,
        head_content,
        working_content,
    })
}
