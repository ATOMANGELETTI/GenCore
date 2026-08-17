use std::path::Path;

/// Strips Windows verbatim prefixes (`\\?\`) via [`dunce::simplified`].
pub(crate) fn normalize_path(path: &str) -> String {
    dunce::simplified(Path::new(path))
        .to_string_lossy()
        .into_owned()
}
