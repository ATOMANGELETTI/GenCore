use super::graph_error::{GitCommitNode, GraphError};
use std::path::Path;

#[tauri::command(rename_all = "snake_case")]
pub fn git_get_log(
    repo_path: String,
    limit: Option<usize>,
    skip: Option<usize>,
) -> Result<Vec<GitCommitNode>, GraphError> {
    let p = Path::new(&repo_path);
    let repo =
        gix::open(p).map_err(|e| GraphError::RepoOpenFailed(repo_path.clone(), e.to_string()))?;

    let max_count = limit.unwrap_or(50);
    let skip_count = skip.unwrap_or(0);

    let head_commit = match repo.head_commit() {
        Ok(c) => c,
        Err(_) => return Ok(Vec::new()),
    };

    let mut nodes = Vec::new();
    let ancestors = head_commit
        .ancestors()
        .all()
        .map_err(|e| GraphError::QueryFailed(e.to_string()))?;

    for (index, info) in ancestors.enumerate() {
        if index < skip_count {
            continue;
        }
        if nodes.len() >= max_count {
            break;
        }

        if let Ok(info) = info
            && let Ok(commit) = info.object()
        {
            let id = commit.id().to_string();
            let short_id = commit.id().to_hex_with_len(7).to_string();
            let summary = commit
                .message()
                .map(|m| m.title.to_string())
                .unwrap_or_default();
            let author = commit
                .author()
                .map_err(|e| GraphError::QueryFailed(e.to_string()))?;
            let author_name = author.name.to_string();
            let author_email = author.email.to_string();
            let timestamp = author.time().map(|t| t.seconds).unwrap_or(0);

            let parents: Vec<String> = commit.parent_ids().map(|pid| pid.to_string()).collect();

            nodes.push(GitCommitNode {
                id,
                short_id,
                summary,
                author_name,
                author_email,
                timestamp,
                parents,
                refs: Vec::new(),
            });
        }
    }

    Ok(nodes)
}
