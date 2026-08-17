use std::path::Path;

/// Strips Windows verbatim prefixes (`\\?\`) via [`dunce::simplified`].
pub(crate) fn normalize_path(path: &str) -> String {
    dunce::simplified(Path::new(path))
        .to_string_lossy()
        .into_owned()
}

/// Last path component after `\` or `/`. Empty when the path ends in a separator.
pub(crate) fn final_path_component(path: &str) -> &str {
    path.rsplit(['\\', '/']).next().unwrap_or(path)
}

/// Windows file-name rules for the **final** path component only.
///
/// Rejects empty, `.`, `..`, `<>:"/\|?*`, trailing space/dot, and reserved
/// device names `CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9]` (case-insensitive, including
/// `CON.txt` where the stem before the first `.` is reserved).
pub(crate) fn validate_windows_file_name(name: &str) -> bool {
    if name.is_empty() || name == "." || name == ".." {
        return false;
    }
    if name.ends_with(' ') || name.ends_with('.') {
        return false;
    }
    if name
        .chars()
        .any(|c| matches!(c, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*'))
    {
        return false;
    }
    let stem = name.split('.').next().unwrap_or(name);
    !is_reserved_device_stem(stem)
}

fn is_reserved_device_stem(stem: &str) -> bool {
    let upper = stem.to_ascii_uppercase();
    matches!(upper.as_str(), "CON" | "PRN" | "AUX" | "NUL") || is_numbered_device(&upper)
}

fn is_numbered_device(upper: &str) -> bool {
    let bytes = upper.as_bytes();
    bytes.len() == 4
        && (bytes.starts_with(b"COM") || bytes.starts_with(b"LPT"))
        && bytes[3].is_ascii_digit()
        && bytes[3] != b'0'
}
