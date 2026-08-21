use std::env;
use std::ffi::OsString;
use std::path::{Path, PathBuf};

/// Bundled Oh My Posh paths resolved from the app resource directory.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OhMyPoshSpawn {
    /// Directory that contains `oh-my-posh.exe` (prepended to `PATH`).
    pub dir: PathBuf,
    /// Absolute path to the matching `.omp.json` theme.
    pub theme: PathBuf,
    /// Absolute path to `gencore-prompt.ps1`.
    pub prompt_script: PathBuf,
}

/// Resolves `pwsh` on `PATH` (honoring `PATHEXT` on Windows), else `powershell.exe`.
pub fn resolve_shell() -> PathBuf {
    find_on_path("pwsh")
        .or_else(|| find_on_path("pwsh.exe"))
        .unwrap_or_else(|| PathBuf::from("powershell.exe"))
}

/// Locates bundled Oh My Posh when both the exe and prompt script exist.
pub fn resolve_oh_my_posh(
    resource_dir: Option<&Path>,
    theme: Option<&str>,
) -> Option<OhMyPoshSpawn> {
    let resource_dir = resource_dir?;
    let dir = oh_my_posh_dir(resource_dir)?;
    let theme_path = dir.join(theme_file_name(theme));
    if !theme_path.is_file() {
        return None;
    }
    Some(OhMyPoshSpawn {
        dir: dir.clone(),
        theme: theme_path,
        prompt_script: dir.join("gencore-prompt.ps1"),
    })
}

/// Prepends `dir` to the current process `PATH`.
pub(crate) fn prepend_path(dir: &Path) -> OsString {
    let current = env::var_os("PATH").unwrap_or_default();
    let mut paths = vec![dir.to_path_buf()];
    paths.extend(env::split_paths(&current));
    env::join_paths(paths).unwrap_or_else(|_| {
        let mut joined = dir.as_os_str().to_os_string();
        joined.push(";");
        joined.push(&current);
        joined
    })
}

fn theme_file_name(theme: Option<&str>) -> &'static str {
    match theme {
        Some("snow-storm") => "gencore-snow-storm.omp.json",
        _ => "gencore-polar-night.omp.json",
    }
}

fn oh_my_posh_dir(resource_dir: &Path) -> Option<PathBuf> {
    for rel in ["oh-my-posh", "resources/oh-my-posh"] {
        let dir = resource_dir.join(rel);
        let exe = dir.join("oh-my-posh.exe");
        let ps1 = dir.join("gencore-prompt.ps1");
        if exe.is_file() && ps1.is_file() {
            return Some(dir);
        }
    }
    None
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
