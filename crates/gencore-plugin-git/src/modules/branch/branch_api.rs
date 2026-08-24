use super::branch_error::{BranchError, GitBranchInfo};
use std::path::Path;

#[tauri::command]
pub fn git_list_branches(repo_path: String) -> Result<Vec<GitBranchInfo>, BranchError> {
    let p = Path::new(&repo_path);
    let repo =
        gix::open(p).map_err(|e| BranchError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;

    let current_branch = repo
        .head_name()
        .ok()
        .flatten()
        .map(|n| n.shorten().to_string());
    let mut branches = Vec::new();

    if let Ok(platform) = repo.references()
        && let Ok(local_iter) = platform.local_branches()
    {
        for r in local_iter.flatten() {
            let name = r.name().shorten().to_string();
            let is_current = current_branch.as_deref() == Some(name.as_str());
            branches.push(GitBranchInfo {
                name,
                is_current,
                is_remote: false,
            });
        }
    }

    Ok(branches)
}

#[tauri::command]
pub fn git_checkout_branch(repo_path: String, name: String) -> Result<(), BranchError> {
    let p = Path::new(&repo_path);
    let repo =
        gix::open(p).map_err(|e| BranchError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;
    let git_dir = repo.git_dir();
    let head_path = git_dir.join("HEAD");
    std::fs::write(&head_path, format!("ref: refs/heads/{}\n", name))
        .map_err(|e| BranchError::OperationFailed(format!("failed to checkout {}: {}", name, e)))?;
    Ok(())
}

#[tauri::command]
pub fn git_create_branch(repo_path: String, name: String) -> Result<(), BranchError> {
    let p = Path::new(&repo_path);
    let repo =
        gix::open(p).map_err(|e| BranchError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;

    if let Ok(head_id) = repo.head_id() {
        let full_name = format!("refs/heads/{}", name);
        let _ = repo.reference(
            full_name,
            head_id.detach(),
            gix::refs::transaction::PreviousValue::MustNotExist,
            "Create branch via GenCore",
        );
    }

    Ok(())
}
