use std::future::Future;
use std::pin::pin;
use std::task::{Context, Poll, Waker};

use gencore_fs::{FsKind, ListArgs, ListError, list};

/// Minimal executor matching `stub_commands.rs` for driving async commands.
fn block_on<F: Future>(future: F) -> F::Output {
    let mut future = pin!(future);
    let waker = Waker::noop();
    let mut cx = Context::from_waker(waker);
    loop {
        if let Poll::Ready(value) = future.as_mut().poll(&mut cx) {
            return value;
        }
    }
}

#[cfg(windows)]
fn set_hidden_attribute(path: &std::path::Path) {
    use std::os::windows::fs::MetadataExt;
    use std::process::Command;

    let output = Command::new("attrib")
        .arg("+H")
        .arg(path)
        .output()
        .expect("attrib should run");
    assert!(
        output.status.success(),
        "attrib +H failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let attrs = std::fs::symlink_metadata(path)
        .expect("metadata for hidden file")
        .file_attributes();
    assert_ne!(
        attrs & 0x2,
        0,
        "FILE_ATTRIBUTE_HIDDEN (0x2) must be set on {}",
        path.display()
    );
}

#[test]
fn list_returns_folders_first_and_marks_hidden() {
    let dir = tempfile::tempdir().expect("temp dir");
    let visible = dir.path().join("visible.txt");
    let hidden_dot = dir.path().join(".hidden");
    let sub = dir.path().join("sub");

    std::fs::write(&visible, b"hi").expect("write visible.txt");
    std::fs::write(&hidden_dot, b"").expect("write .hidden");
    std::fs::create_dir(&sub).expect("create sub");

    #[cfg(windows)]
    {
        let win_hidden = dir.path().join("win_hidden.txt");
        std::fs::write(&win_hidden, b"").expect("write win_hidden.txt");
        set_hidden_attribute(&win_hidden);
    }

    let result = block_on(list(ListArgs {
        path: dir.path().to_string_lossy().into_owned(),
    }))
    .expect("list should succeed");

    let names: Vec<&str> = result
        .entries
        .iter()
        .map(|entry| entry.name.as_str())
        .collect();
    #[cfg(windows)]
    assert_eq!(
        names,
        vec!["sub", ".hidden", "visible.txt", "win_hidden.txt"]
    );
    #[cfg(not(windows))]
    assert_eq!(names, vec!["sub", ".hidden", "visible.txt"]);
    assert_eq!(result.entries[0].kind, FsKind::Dir);
    assert!(
        result.entries[1..]
            .iter()
            .all(|entry| entry.kind == FsKind::File)
    );

    let by_name: std::collections::HashMap<&str, &gencore_fs::FsEntry> = result
        .entries
        .iter()
        .map(|entry| (entry.name.as_str(), entry))
        .collect();

    assert!(by_name[".hidden"].hidden, ".hidden is hidden by name");
    assert!(!by_name["visible.txt"].hidden);
    assert!(!by_name["sub"].hidden);
    #[cfg(windows)]
    assert!(
        by_name["win_hidden.txt"].hidden,
        "win_hidden.txt is hidden by FILE_ATTRIBUTE_HIDDEN"
    );

    assert_eq!(by_name["visible.txt"].extension.as_deref(), Some("txt"));
    assert_eq!(by_name[".hidden"].extension, None);
    assert_eq!(by_name["sub"].extension, None);

    for entry in &result.entries {
        assert!(
            !entry.path.starts_with(r"\\?\"),
            "entry path must not be verbatim: {}",
            entry.path
        );
        assert!(!entry.system);
    }
}

#[test]
fn list_missing_path_returns_not_found() {
    let dir = tempfile::tempdir().expect("temp dir");
    let missing = dir.path().join("missing-dir");
    let result = block_on(list(ListArgs {
        path: missing.to_string_lossy().into_owned(),
    }));
    assert!(matches!(result, Err(ListError::NotFound)));
}

#[test]
fn list_file_path_returns_not_a_directory() {
    let dir = tempfile::tempdir().expect("temp dir");
    let file = dir.path().join("visible.txt");
    std::fs::write(&file, b"hi").expect("write file");
    let result = block_on(list(ListArgs {
        path: file.to_string_lossy().into_owned(),
    }));
    assert!(matches!(result, Err(ListError::NotADirectory)));
}

#[cfg(windows)]
#[test]
fn list_drives_returns_windows_drive_roots() {
    use gencore_fs::{DriveKind, list_drives};

    let drives = block_on(list_drives()).expect("list_drives should succeed");
    assert!(!drives.is_empty(), "expected at least one system drive");

    let mut saw_drive_root = false;
    for drive in &drives {
        assert!(
            !drive.path.starts_with(r"\\?\"),
            "drive path must not be verbatim: {}",
            drive.path
        );
        let bytes = drive.path.as_bytes();
        assert!(
            bytes.len() == 3
                && bytes[0].is_ascii_alphabetic()
                && bytes[1] == b':'
                && bytes[2] == b'\\',
            "drive path must match X:\\, got {}",
            drive.path
        );
        assert_eq!(
            drive.path,
            format!("{}\\", drive.name),
            "name should be the drive letter display (C:)"
        );
        match drive.kind {
            DriveKind::Fixed
            | DriveKind::Removable
            | DriveKind::Network
            | DriveKind::Optical
            | DriveKind::Unknown => {}
        }
        saw_drive_root = true;
    }
    assert!(saw_drive_root);
}
