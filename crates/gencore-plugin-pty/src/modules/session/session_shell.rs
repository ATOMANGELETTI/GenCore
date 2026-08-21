use std::env;
use std::ffi::OsString;
use std::path::{Path, PathBuf};

/// Resolves `pwsh` on `PATH` (honoring `PATHEXT` on Windows), else `powershell.exe`.
pub fn resolve_shell() -> PathBuf {
    find_on_path("pwsh")
        .or_else(|| find_on_path("pwsh.exe"))
        .unwrap_or_else(|| PathBuf::from("powershell.exe"))
}

fn find_on_path(name: &str) -> Option<PathBuf> {
    let path = env::var_os("PATH")?;
    let extensions = path_extensions(name);
    for dir in env::split_paths(&path) {
        for candidate in candidates(&dir, name, &extensions) {
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

fn path_extensions(name: &str) -> Vec<OsString> {
    if Path::new(name).extension().is_some() {
        return Vec::new();
    }
    env::var("PATHEXT")
        .unwrap_or_else(|_| ".EXE;.BAT;.CMD;.COM".into())
        .split(';')
        .filter(|ext| !ext.is_empty())
        .map(OsString::from)
        .collect()
}

fn candidates(dir: &Path, name: &str, extensions: &[OsString]) -> Vec<PathBuf> {
    let mut out = vec![dir.join(name)];
    for ext in extensions {
        let mut file = OsString::from(name);
        file.push(ext);
        out.push(dir.join(file));
    }
    out
}
