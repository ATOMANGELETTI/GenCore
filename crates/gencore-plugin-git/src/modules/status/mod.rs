pub mod status_api;
pub mod status_error;

pub use status_api::git_get_status;
pub use status_error::{GitFileStatus, GitStatusResult, StatusError};
