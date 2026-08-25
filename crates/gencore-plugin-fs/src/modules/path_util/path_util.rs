use std::fs::Metadata;
use std::path::Path;

/// Strips Windows verbatim prefixes (`\\?\`) via [`dunce::simplified`].
pub(crate) fn normalize_path(path: &str) -> String {
    dunce::simplified(Path::new(path))
        .to_string_lossy()
        .into_owned()
}

/// Extension without the leading dot, if any.
pub(crate) fn extension_of(name: &str) -> Option<String> {
    Path::new(name)
        .extension()
        .map(|ext| ext.to_string_lossy().into_owned())
}

/// Whether an entry is hidden: a leading `.` in the name, or Windows `FILE_ATTRIBUTE_HIDDEN`.
pub(crate) fn is_hidden(name: &str, attrs: Option<u32>) -> bool {
    name.starts_with('.') || attrs.is_some_and(|value| (value & 0x2) != 0)
}

/// Whether an entry has Windows `FILE_ATTRIBUTE_SYSTEM`. Always `false` on other platforms.
pub(crate) fn is_system(attrs: Option<u32>) -> bool {
    attrs.is_some_and(|value| (value & 0x4) != 0)
}

/// Raw Windows file attributes, when available.
pub(crate) fn file_attributes(metadata: &Metadata) -> Option<u32> {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        Some(metadata.file_attributes())
    }
    #[cfg(not(windows))]
    {
        let _ = metadata;
        None
    }
}

/// Converts a [`std::time::SystemTime`] to milliseconds since the Unix epoch.
/// `None` when the time predates the epoch or overflows `i64`.
pub(crate) fn system_time_to_ms(time: std::time::SystemTime) -> Option<i64> {
    time.duration_since(std::time::UNIX_EPOCH)
        .ok()
        .and_then(|duration| i64::try_from(duration.as_millis()).ok())
}

/// Joins a directory and a final path component with a single `\` separator.
fn join_path(dir: &str, name: &str) -> String {
    if dir.ends_with('\\') || dir.ends_with('/') {
        format!("{dir}{name}")
    } else {
        format!("{dir}\\{name}")
    }
}

/// Splits `name` into (stem, extension). No extension when the name has no
/// `.` or starts with one (so `.gitignore` has no extension, matching `list`).
fn split_stem_ext(name: &str) -> (String, Option<String>) {
    match name.rsplit_once('.') {
        Some((stem, ext)) if !stem.is_empty() => (stem.to_owned(), Some(ext.to_owned())),
        _ => (name.to_owned(), None),
    }
}

/// Returns a path in `dir` for `name` that does not exist yet, suffixing
/// `name` with ` (2)`, ` (3)`, … before the extension on a collision. Falls
/// back to the original (colliding) candidate after 9999 attempts.
pub(crate) fn unique_destination(dir: &str, name: &str) -> String {
    let candidate = join_path(dir, name);
    if !Path::new(&candidate).exists() {
        return candidate;
    }

    let (stem, ext) = split_stem_ext(name);
    for index in 2..10_000 {
        let suffixed = match &ext {
            Some(ext) => format!("{stem} ({index}).{ext}"),
            None => format!("{stem} ({index})"),
        };
        let candidate = join_path(dir, &suffixed);
        if !Path::new(&candidate).exists() {
            return candidate;
        }
    }
    candidate
}

/// Recursively copies `source` to `target`, which must not already exist.
/// Shared by the `copy` command and `move_paths`'s cross-volume fallback.
pub(crate) fn copy_recursive(source: &Path, target: &Path) -> std::io::Result<()> {
    let metadata = std::fs::symlink_metadata(source)?;
    if metadata.is_dir() {
        std::fs::create_dir(target)?;
        for entry in std::fs::read_dir(source)? {
            let entry = entry?;
            copy_recursive(&entry.path(), &target.join(entry.file_name()))?;
        }
    } else {
        std::fs::copy(source, target)?;
    }
    Ok(())
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
