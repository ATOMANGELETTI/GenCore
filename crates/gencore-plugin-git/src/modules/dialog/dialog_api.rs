use super::dialog_error::DialogError;

#[tauri::command]
pub async fn git_pick_folder() -> Result<Option<String>, DialogError> {
    let folder = rfd::AsyncFileDialog::new()
        .set_title("Open Workspace Folder")
        .pick_folder()
        .await;

    Ok(folder.map(|handle| handle.path().to_string_lossy().to_string()))
}
