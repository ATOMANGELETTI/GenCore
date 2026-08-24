use super::status_error::{GitFileStatus, GitStatusResult, StatusError};
use std::path::Path;

impl GitStatusResult {
    pub fn empty() -> Self {
        Self {
            is_repo: false,
            root_path: None,
            branch: None,
            upstream: None,
            ahead: 0,
            behind: 0,
            staged: Vec::new(),
            unstaged: Vec::new(),
            untracked: Vec::new(),
            conflicted: Vec::new(),
        }
    }
}

#[tauri::command]
pub fn git_get_status(path: String) -> Result<GitStatusResult, StatusError> {
    let p = Path::new(&path);
    let repo = match gix::discover(p) {
        Ok(r) => r,
        Err(_) => return Ok(GitStatusResult::empty()),
    };

    let root_path = repo.workdir().map(|d| d.to_string_lossy().to_string());
    let branch = repo
        .head_name()
        .ok()
        .flatten()
        .map(|n| n.shorten().to_string());

    let staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();
    let conflicted = Vec::new();

    // Use gix status platform for index and worktree scanning
    if let Ok(status_platform) = repo.status(gix::progress::Discard)
        && let Ok(iter) = status_platform.into_index_worktree_iter(Vec::new())
    {
        for item in iter.flatten() {
            use gix::status::index_worktree::Item;
            match item {
                Item::Modification {
                    rela_path, status, ..
                } => {
                    let path_str = rela_path.to_string();
                    unstaged.push(GitFileStatus {
                        path: path_str,
                        status: format!("{:?}", status).to_lowercase(),
                        additions: 0,
                        deletions: 0,
                    });
                }
                Item::DirectoryContents { entry, .. } => {
                    untracked.push(entry.rela_path.to_string());
                }
                _ => {}
            }
        }
    }

    Ok(GitStatusResult {
        is_repo: true,
        root_path,
        branch,
        upstream: None,
        ahead: 0,
        behind: 0,
        staged,
        unstaged,
        untracked,
        conflicted,
    })
}
