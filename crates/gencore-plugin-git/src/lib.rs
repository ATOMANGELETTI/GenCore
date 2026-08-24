//! Git plugin for GenCore using gitoxide.
//!
//! Provides Git status, staging, committing, branching, stashes, and revision graph queries.

mod modules;

pub use modules::branch::{
    BranchError, GitBranchInfo, git_checkout_branch, git_create_branch, git_list_branches,
};
pub use modules::commit::{CommitError, GitCommitResult, git_commit};
pub use modules::dialog::{DialogError, git_pick_folder};
pub use modules::diff::{DiffError, git_get_diff};
pub use modules::graph::{GitCommitNode, GraphError, git_get_log};
pub use modules::init::{InitError, git_init_repo};
pub use modules::stage::{
    StageError, git_discard_changes, git_stage_all, git_stage_file, git_unstage_all,
    git_unstage_file,
};
pub use modules::stash::{StashError, git_stash_pop, git_stash_save};
pub use modules::status::{GitFileStatus, GitStatusResult, StatusError, git_get_status};

use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};

pub const PLUGIN_ID: &str = "gencore-git";

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new(PLUGIN_ID)
        .invoke_handler(tauri::generate_handler![
            git_get_status,
            git_stage_file,
            git_unstage_file,
            git_stage_all,
            git_unstage_all,
            git_discard_changes,
            git_commit,
            git_init_repo,
            git_get_diff,
            git_get_log,
            git_list_branches,
            git_checkout_branch,
            git_create_branch,
            git_stash_save,
            git_stash_pop,
            git_pick_folder
        ])
        .build()
}
