#[allow(clippy::module_inception)] // `{module}/{module}.rs` layout required by the plan
mod path_util;

pub(crate) use path_util::{
    copy_recursive, extension_of, file_attributes, final_path_component, is_hidden, is_system,
    normalize_path, system_time_to_ms, unique_destination, validate_windows_file_name,
};
