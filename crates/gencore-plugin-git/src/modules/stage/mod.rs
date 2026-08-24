pub mod stage_api;
pub mod stage_error;

pub use stage_api::{
    git_discard_changes, git_stage_all, git_stage_file, git_unstage_all, git_unstage_file,
};
pub use stage_error::StageError;
