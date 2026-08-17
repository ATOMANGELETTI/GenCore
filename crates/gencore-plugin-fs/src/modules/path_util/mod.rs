#[allow(clippy::module_inception)] // `{module}/{module}.rs` layout required by the plan
mod path_util;

pub(crate) use path_util::normalize_path;
