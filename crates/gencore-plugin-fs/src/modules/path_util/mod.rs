#[allow(clippy::module_inception)] // `{module}/{module}.rs` layout required by the plan
mod path_util;

pub(crate) use path_util::{final_path_component, normalize_path, validate_windows_file_name};
