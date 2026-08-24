use super::init_error::InitError;
use std::path::Path;

#[tauri::command(rename_all = "snake_case")]
pub fn git_init_repo(path: String) -> Result<(), InitError> {
    let p = Path::new(&path);
    gix::init(p).map_err(|err| InitError::InitFailed(err.to_string()))?;
    Ok(())
}
