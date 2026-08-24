use super::stage_error::StageError;
use std::path::Path;

fn open_or_create_index(repo: &gix::Repository) -> Result<gix::index::File, StageError> {
    match repo.open_index() {
        Ok(idx) => Ok(idx),
        Err(_) => {
            let state = gix::index::State::new(repo.object_hash());
            Ok(gix::index::File::from_state(
                state,
                repo.git_dir().join("index"),
            ))
        }
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn git_stage_file(repo_path: String, file_path: String) -> Result<(), StageError> {
    let p = Path::new(&repo_path);
    let repo =
        gix::open(p).map_err(|e| StageError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;
    let mut index = open_or_create_index(&repo)?;

    // Convert to relative path
    let rel_path = Path::new(&file_path);
    let rel_path_clean = if rel_path.is_absolute() {
        if let Ok(clean) = rel_path.strip_prefix(p) {
            clean
        } else {
            rel_path
        }
    } else {
        rel_path
    };

    let bstr_path = gix::path::into_bstr(rel_path_clean);

    let full_path = if rel_path.is_absolute() {
        rel_path.to_path_buf()
    } else {
        p.join(rel_path)
    };

    if full_path.exists()
        && let Ok(data) = std::fs::read(&full_path)
        && let Ok(oid) = repo.write_blob(&data)
    {
        let stat = gix::index::entry::Stat::default();
        let flags = gix::index::entry::Flags::empty();
        let mode = gix::index::entry::Mode::FILE;

        index.dangerously_push_entry(stat, oid.detach(), flags, mode, bstr_path.as_ref());
        index.sort_entries();
        let _ = index.write(gix::index::write::Options::default());
    }

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn git_unstage_file(repo_path: String, file_path: String) -> Result<(), StageError> {
    let p = Path::new(&repo_path);
    let repo =
        gix::open(p).map_err(|e| StageError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;
    let mut index = open_or_create_index(&repo)?;

    let rel_path = Path::new(&file_path);
    let rel_path_clean = if rel_path.is_absolute() {
        if let Ok(clean) = rel_path.strip_prefix(p) {
            clean
        } else {
            rel_path
        }
    } else {
        rel_path
    };

    let bstr_path = gix::path::into_bstr(rel_path_clean);
    if let Ok(pos) = index.entry_index_by_path(bstr_path.as_ref()) {
        index.remove_entry_at_index(pos);
        let _ = index.write(gix::index::write::Options::default());
    }

    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn git_stage_all(repo_path: String) -> Result<(), StageError> {
    let p = Path::new(&repo_path);
    let _repo =
        gix::open(p).map_err(|e| StageError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn git_unstage_all(repo_path: String) -> Result<(), StageError> {
    let p = Path::new(&repo_path);
    let repo =
        gix::open(p).map_err(|e| StageError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;
    let mut index = open_or_create_index(&repo)?;
    while !index.entries().is_empty() {
        index.remove_entry_at_index(0);
    }
    let _ = index.write(gix::index::write::Options::default());
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
pub fn git_discard_changes(repo_path: String, file_path: String) -> Result<(), StageError> {
    let p = Path::new(&repo_path);
    let repo =
        gix::open(p).map_err(|e| StageError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;

    let full_path = Path::new(&file_path);
    let full = if full_path.is_absolute() {
        full_path.to_path_buf()
    } else {
        p.join(full_path)
    };

    if let Ok(head_commit) = repo.head_commit()
        && let Ok(tree) = head_commit.tree()
    {
        let rel = if full_path.is_absolute() {
            full_path.strip_prefix(p).unwrap_or(full_path)
        } else {
            full_path
        };
        let rel_posix = rel.to_string_lossy().replace('\\', "/");
        if let Ok(Some(entry)) = tree.lookup_entry_by_path(&rel_posix)
            && let Ok(obj) = entry.object()
        {
            let _ = std::fs::write(&full, &obj.data);
        }
    }

    Ok(())
}
