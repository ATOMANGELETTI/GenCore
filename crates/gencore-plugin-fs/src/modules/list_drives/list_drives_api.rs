use std::path::Path;

use serde::Serialize;
use sysinfo::{Disk, DiskKind, Disks};

use super::list_drives_error::ListDrivesError;
use crate::modules::path_util::normalize_path;

/// Kind of a system drive.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DriveKind {
    /// Internal HDD or SSD.
    Fixed,
    /// Removable media such as USB.
    Removable,
    /// Network-mapped drive.
    Network,
    /// Optical drive (CD/DVD).
    Optical,
    /// Unclassified drive.
    Unknown,
}

/// A drive root returned by [`list_drives`].
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct DriveEntry {
    /// Drive letter display (`C:`).
    pub name: String,
    /// Drive root path with a trailing backslash (`C:\`).
    pub path: String,
    /// Drive kind.
    pub kind: DriveKind,
    /// Volume label when sysinfo reports a non-empty name.
    pub label: Option<String>,
}

/// Whether a sysinfo disk should appear in [`list_drives`].
///
/// Empty and not-ready volumes typically report `total_space == 0`.
pub fn is_usable_mount(total_space: u64) -> bool {
    total_space > 0
}

/// Lists ready Windows drive roots (`C:\`, `D:\`, …).
#[tauri::command]
pub async fn list_drives() -> Result<Vec<DriveEntry>, ListDrivesError> {
    let disks = Disks::new_with_refreshed_list();
    let mut drives = Vec::new();

    for disk in disks.list() {
        if !is_usable_mount(disk.total_space()) {
            continue;
        }
        let Some((name, path)) = drive_root(disk.mount_point()) else {
            continue;
        };
        let label = disk.name().to_string_lossy();
        let label = if label.is_empty() {
            None
        } else {
            Some(label.into_owned())
        };
        drives.push(DriveEntry {
            name,
            path,
            kind: map_drive_kind(disk),
            label,
        });
    }

    drives.sort_by_key(|drive| drive.name.to_lowercase());
    Ok(drives)
}

fn drive_root(mount_point: &Path) -> Option<(String, String)> {
    let normalized = normalize_path(&mount_point.to_string_lossy());
    let trimmed = normalized.trim_end_matches(['\\', '/']);
    let mut chars = trimmed.chars();
    let letter = chars.next()?;
    if !letter.is_ascii_alphabetic() {
        return None;
    }
    if chars.next() != Some(':') {
        return None;
    }
    if chars.next().is_some() {
        return None;
    }
    Some((format!("{letter}:"), format!("{letter}:\\")))
}

fn map_drive_kind(disk: &Disk) -> DriveKind {
    match disk.kind() {
        DiskKind::HDD | DiskKind::SSD => DriveKind::Fixed,
        DiskKind::Unknown(_) => {
            if disk.is_removable() {
                DriveKind::Removable
            } else if looks_optical(disk) {
                DriveKind::Optical
            } else if looks_network(disk) {
                DriveKind::Network
            } else {
                DriveKind::Unknown
            }
        }
    }
}

fn looks_optical(disk: &Disk) -> bool {
    let file_system = disk.file_system().to_string_lossy().to_ascii_lowercase();
    if matches!(file_system.as_str(), "cdfs" | "udf" | "iso9660" | "cdrom") {
        return true;
    }
    let name = disk.name().to_string_lossy().to_ascii_lowercase();
    name.contains("cdrom") || name.contains("dvd") || name.contains("optical")
}

fn looks_network(disk: &Disk) -> bool {
    let file_system = disk.file_system().to_string_lossy().to_ascii_lowercase();
    matches!(
        file_system.as_str(),
        "nfs" | "smb" | "cifs" | "webdav" | "nwfs" | "csc"
    ) || file_system.contains("network")
}
