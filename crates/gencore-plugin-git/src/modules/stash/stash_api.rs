use super::stash_error::StashError;
use std::path::Path;

#[tauri::command]
pub fn git_stash_save(repo_path: String, _message: Option<String>) -> Result<(), StashError> {
    let p = Path::new(&repo_path);
    let _repo =
        gix::open(p).map_err(|e| StashError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub fn git_stash_pop(repo_path: String) -> Result<(), StashError> {
    let p = Path::new(&repo_path);
    let _repo =
        gix::open(p).map_err(|e| StashError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;
    Ok(())
}
