use std::path::PathBuf;
#[cfg(windows)]
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
#[cfg(windows)]
use std::time::{Duration, Instant};

#[cfg(windows)]
use base64::Engine;
#[cfg(windows)]
use base64::engine::general_purpose::STANDARD;
use gencore_pty::{
    IoError, OpenArgs, SessionError, SessionMap, is_real_executable, kill_session,
    resolve_oh_my_posh, shell_launch, spawn_session, strip_verbatim_prefix, write_session,
};

/// DSR cursor-position request ConPTY emits at startup; the terminal must answer.
#[cfg(windows)]
const CURSOR_POSITION_REQUEST: &str = "\u{1b}[6n";

#[test]
fn open_args_default_theme_and_cwd_are_optional() {
    let parsed: OpenArgs =
        serde_json::from_value(serde_json::json!({ "cols": 80, "rows": 24 })).unwrap();
    assert_eq!(parsed.cols, 80);
    assert!(parsed.cwd.is_none());
    assert!(parsed.theme.is_none());
    assert!(parsed.posh_theme.is_none());
}

#[test]
fn open_args_posh_theme_is_supported() {
    let parsed: OpenArgs = serde_json::from_value(
        serde_json::json!({ "cols": 80, "rows": 24, "posh_theme": "bubbles" }),
    )
    .unwrap();
    assert_eq!(parsed.posh_theme.as_deref(), Some("bubbles"));
}

#[test]
fn open_args_reject_unknown_fields() {
    let parsed: Result<OpenArgs, _> =
        serde_json::from_value(serde_json::json!({ "cols": 80, "rows": 24, "shell": "cmd.exe" }));
    assert!(parsed.is_err());
}

#[test]
fn spawn_session_rejects_invalid_theme() {
    let map = Arc::new(Mutex::new(SessionMap::new()));
    let result = spawn_session(
        &map,
        OpenArgs {
            cols: 80,
            rows: 24,
            cwd: None,
            theme: Some("nord".into()),
            posh_theme: None,
            command: None,
        },
        None,
        |_| {},
        |_| {},
    );
    assert!(matches!(result, Err(SessionError::InvalidTheme)));
}

#[test]
fn spawn_session_rejects_invalid_posh_theme() {
    let map = Arc::new(Mutex::new(SessionMap::new()));
    let result = spawn_session(
        &map,
        OpenArgs {
            cols: 80,
            rows: 24,
            cwd: None,
            theme: None,
            posh_theme: Some("not-a-real-theme".into()),
            command: None,
        },
        None,
        |_| {},
        |_| {},
    );
    assert!(matches!(result, Err(SessionError::InvalidTheme)));
}

#[test]
fn spawn_session_rejects_invalid_cwd() {
    let map = Arc::new(Mutex::new(SessionMap::new()));
    let result = spawn_session(
        &map,
        OpenArgs {
            cols: 80,
            rows: 24,
            cwd: Some("C:\\gencore-pty-invalid-cwd-test".into()),
            theme: None,
            posh_theme: None,
            command: None,
        },
        None,
        |_| {},
        |_| {},
    );
    assert!(matches!(result, Err(SessionError::InvalidCwd)));
}

#[test]
fn write_and_kill_unknown_session_are_not_found() {
    let map = Arc::new(Mutex::new(SessionMap::new()));
    let write = write_session(&map, "missing", "hello");
    assert!(matches!(write, Err(IoError::SessionNotFound)));
    let kill = kill_session(&map, "missing");
    assert!(matches!(kill, Err(SessionError::SessionNotFound)));
}

#[cfg(windows)]
struct KillOnDrop {
    map: Arc<Mutex<SessionMap>>,
    session_id: String,
}

#[cfg(windows)]
impl Drop for KillOnDrop {
    fn drop(&mut self) {
        let _ = kill_session(&self.map, &self.session_id);
    }
}

#[cfg(windows)]
#[test]
fn open_echo_and_close() {
    let map = Arc::new(Mutex::new(SessionMap::new()));
    let (data_tx, data_rx) = mpsc::channel();
    let (exit_tx, _exit_rx) = mpsc::channel();

    let session_id = spawn_session(
        &map,
        OpenArgs {
            cols: 80,
            rows: 24,
            cwd: None,
            theme: None,
            posh_theme: None,
            command: None,
        },
        None,
        move |payload| {
            let _ = data_tx.send(payload);
        },
        move |payload| {
            let _ = exit_tx.send(payload);
        },
    )
    .expect("spawn_session");
    let _guard = KillOnDrop {
        map: Arc::clone(&map),
        session_id: session_id.clone(),
    };

    write_session(&map, &session_id, "echo hello\r\n").expect("write_session");

    let deadline = Instant::now() + Duration::from_secs(3);
    let mut got_output = false;
    while Instant::now() < deadline {
        if let Ok(payload) = data_rx.recv_timeout(Duration::from_millis(100))
            && !payload.data.is_empty()
        {
            got_output = true;
            break;
        }
    }

    kill_session(&map, &session_id).expect("kill_session");
    assert!(got_output, "expected ConPTY output within 3s");
}

#[cfg(windows)]
#[test]
fn exited_shell_is_reaped_from_the_session_map() {
    let map = Arc::new(Mutex::new(SessionMap::new()));
    let (data_tx, data_rx) = mpsc::channel();
    let (exit_tx, exit_rx) = mpsc::channel();

    let session_id = spawn_session(
        &map,
        OpenArgs {
            cols: 80,
            rows: 24,
            cwd: None,
            theme: None,
            posh_theme: None,
            command: None,
        },
        None,
        move |payload| {
            let _ = data_tx.send(payload);
        },
        move |payload| {
            let _ = exit_tx.send(payload);
        },
    )
    .expect("spawn_session");
    let _guard = KillOnDrop {
        map: Arc::clone(&map),
        session_id: session_id.clone(),
    };

    let deadline = Instant::now() + Duration::from_secs(30);
    let mut next_exit_attempt = Instant::now() + Duration::from_millis(500);
    let mut text = String::new();
    while Instant::now() < deadline {
        while let Ok(payload) = data_rx.try_recv() {
            let raw = STANDARD.decode(&payload.data).unwrap_or_default();
            text.push_str(&String::from_utf8_lossy(&raw));
        }
        // ConPTY asks the terminal for the cursor position on startup and the
        // shell does not reach a prompt until something answers. xterm.js does
        // this in the app; here the test has to play terminal.
        if text.contains(CURSOR_POSITION_REQUEST) {
            text = text.replace(CURSOR_POSITION_REQUEST, "");
            let _ = write_session(&map, &session_id, "\u{1b}[1;1R");
        }
        if Instant::now() >= next_exit_attempt {
            // Bare CR: LF would open a PSReadLine continuation prompt instead.
            let _ = write_session(&map, &session_id, "exit\r");
            next_exit_attempt = Instant::now() + Duration::from_secs(2);
        }
        if let Ok(payload) = exit_rx.try_recv() {
            assert_eq!(payload.session_id, session_id);
            assert!(
                map.lock().expect("session map mutex").is_empty(),
                "the exited session must be reaped before the exit event fires"
            );
            assert!(matches!(
                kill_session(&map, &session_id),
                Err(SessionError::SessionNotFound)
            ));
            return;
        }
        std::thread::sleep(Duration::from_millis(50));
    }

    panic!("no pty exit event within 30s; shell output so far: {text:?}");
}

#[test]
fn resolve_oh_my_posh_none_without_resource_dir() {
    assert!(resolve_oh_my_posh(None, None, None).is_none());
    assert!(resolve_oh_my_posh(None, Some("snow-storm"), None).is_none());
}

#[test]
fn resolve_oh_my_posh_none_when_exe_or_script_missing() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-omp-missing-{}", std::process::id()));
    let omp = dir.join("oh-my-posh");
    std::fs::create_dir_all(&omp).unwrap();
    std::fs::write(omp.join("gencore-prompt.ps1"), "#").unwrap();
    assert!(resolve_oh_my_posh(Some(&dir), None, None).is_none());
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn resolve_oh_my_posh_uses_absolute_theme_json() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-omp-ok-{}", std::process::id()));
    let omp = dir.join("oh-my-posh");
    std::fs::create_dir_all(&omp).unwrap();
    std::fs::write(omp.join("oh-my-posh.exe"), b"MZ").unwrap();
    std::fs::write(omp.join("gencore-prompt.ps1"), "#").unwrap();
    std::fs::write(omp.join("gencore-polar-night.omp.json"), "{}").unwrap();
    std::fs::write(omp.join("gencore-snow-storm.omp.json"), "{}").unwrap();

    let polar = resolve_oh_my_posh(Some(&dir), Some("polar-night"), None).expect("polar-night");
    assert!(polar.theme.is_absolute());
    assert!(polar.prompt_script.is_absolute());
    assert!(
        !polar.theme.to_string_lossy().starts_with(r"\\?\"),
        "theme must not be a Windows verbatim path: {}",
        polar.theme.display()
    );
    assert!(
        !polar.prompt_script.to_string_lossy().starts_with(r"\\?\"),
        "prompt_script must not be a Windows verbatim path: {}",
        polar.prompt_script.display()
    );
    assert!(polar.theme.ends_with("gencore-polar-night.omp.json"));
    assert!(polar.prompt_script.ends_with("gencore-prompt.ps1"));

    let snow = resolve_oh_my_posh(Some(&dir), Some("snow-storm"), None).expect("snow-storm");
    assert!(snow.theme.ends_with("gencore-snow-storm.omp.json"));

    let omitted = resolve_oh_my_posh(Some(&dir), None, None).expect("default polar-night");
    assert!(omitted.theme.ends_with("gencore-polar-night.omp.json"));

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn resolve_oh_my_posh_accepts_resources_subdirectory() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-omp-nested-{}", std::process::id()));
    let nested = dir.join("resources").join("oh-my-posh");
    std::fs::create_dir_all(&nested).unwrap();
    std::fs::write(nested.join("oh-my-posh.exe"), b"MZ").unwrap();
    std::fs::write(nested.join("gencore-prompt.ps1"), "#").unwrap();
    std::fs::write(nested.join("gencore-polar-night.omp.json"), "{}").unwrap();

    let resolved = resolve_oh_my_posh(Some(&dir), None, None).expect("nested resources");
    assert!(resolved.theme.ends_with("gencore-polar-night.omp.json"));

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn is_real_executable_rejects_zero_byte_file() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-exec-zero-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let stub = dir.join("pwsh.exe");
    std::fs::write(&stub, []).unwrap();
    assert!(
        !is_real_executable(&stub),
        "zero-byte App Execution Alias stubs must be rejected"
    );
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn is_real_executable_accepts_non_empty_file() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-exec-ok-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let exe = dir.join("pwsh.exe");
    std::fs::write(&exe, b"MZ").unwrap();
    assert!(
        is_real_executable(&exe),
        "non-empty files must be treated as real executables"
    );
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn is_real_executable_rejects_nonexistent_path() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-exec-missing-{}", std::process::id()));
    let missing = dir.join("pwsh.exe");
    assert!(
        !is_real_executable(&missing),
        "missing paths must be rejected"
    );
}

#[test]
fn resolve_oh_my_posh_none_when_exe_is_zero_bytes() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-omp-zero-{}", std::process::id()));
    let omp = dir.join("oh-my-posh");
    std::fs::create_dir_all(&omp).unwrap();
    std::fs::write(omp.join("oh-my-posh.exe"), []).unwrap();
    std::fs::write(omp.join("gencore-prompt.ps1"), "#").unwrap();
    std::fs::write(omp.join("gencore-polar-night.omp.json"), "{}").unwrap();
    assert!(resolve_oh_my_posh(Some(&dir), None, None).is_none());
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn strip_verbatim_prefix_removes_windows_extended_path() {
    let verbatim = PathBuf::from(r"\\?\C:\theme.json");
    let stripped = strip_verbatim_prefix(&verbatim);
    assert_eq!(stripped, PathBuf::from(r"C:\theme.json"));
    assert_eq!(
        strip_verbatim_prefix(&PathBuf::from(r"C:\theme.json")),
        PathBuf::from(r"C:\theme.json")
    );
}

#[test]
fn shell_launch_plain_is_nologo_only() {
    let launch = shell_launch(None);
    let args: Vec<String> = launch
        .args
        .iter()
        .map(|a| a.to_string_lossy().into_owned())
        .collect();
    assert_eq!(args, vec!["-NoLogo"]);
    assert!(launch.path.is_none());
    assert!(launch.posh_theme.is_none());
}

#[test]
fn shell_launch_omp_includes_noexit_and_file() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-launch-{}", std::process::id()));
    let omp_dir = dir.join("oh-my-posh");
    std::fs::create_dir_all(&omp_dir).unwrap();
    std::fs::write(omp_dir.join("oh-my-posh.exe"), b"MZ").unwrap();
    std::fs::write(omp_dir.join("gencore-prompt.ps1"), "#").unwrap();
    std::fs::write(omp_dir.join("gencore-polar-night.omp.json"), "{}").unwrap();
    let omp = resolve_oh_my_posh(Some(&dir), None, None).expect("omp");
    let launch = shell_launch(Some(&omp));
    let args: Vec<String> = launch
        .args
        .iter()
        .map(|a| a.to_string_lossy().into_owned())
        .collect();
    assert!(args.contains(&"-NoLogo".into()));
    assert!(args.contains(&"-NoProfile".into()));
    assert!(args.contains(&"-NoExit".into()));
    assert!(args.contains(&"-File".into()));
    assert!(!args.iter().any(|a| a.starts_with(r"\\?\")));
    let theme = launch.posh_theme.expect("theme");
    assert!(!theme.to_string_lossy().starts_with(r"\\?\"));
    assert!(launch.path.is_some());
    let _ = std::fs::remove_dir_all(&dir);
}

#[cfg(windows)]
#[test]
fn omp_file_spawn_stays_alive_and_echoes() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-omp-live-{}", std::process::id()));
    let omp = dir.join("oh-my-posh");
    std::fs::create_dir_all(&omp).unwrap();
    std::fs::write(omp.join("oh-my-posh.exe"), b"MZ").unwrap();
    std::fs::write(omp.join("gencore-prompt.ps1"), "# noop\r\n").unwrap();
    std::fs::write(omp.join("gencore-polar-night.omp.json"), "{}").unwrap();

    let map = Arc::new(Mutex::new(SessionMap::new()));
    let (data_tx, data_rx) = mpsc::channel();
    let (exit_tx, exit_rx) = mpsc::channel();
    let session_id = spawn_session(
        &map,
        OpenArgs {
            cols: 80,
            rows: 24,
            cwd: None,
            theme: None,
            posh_theme: None,
            command: None,
        },
        Some(dir.clone()),
        move |payload| {
            let _ = data_tx.send(payload);
        },
        move |payload| {
            let _ = exit_tx.send(payload);
        },
    )
    .expect("spawn_session");
    let _guard = KillOnDrop {
        map: Arc::clone(&map),
        session_id: session_id.clone(),
    };

    let deadline = Instant::now() + Duration::from_secs(15);
    let mut text = String::new();
    let mut wrote_echo = false;
    while Instant::now() < deadline {
        if exit_rx.try_recv().is_ok() {
            panic!("shell exited; -NoExit missing. output so far: {text:?}");
        }
        while let Ok(payload) = data_rx.try_recv() {
            let raw = STANDARD.decode(&payload.data).unwrap_or_default();
            text.push_str(&String::from_utf8_lossy(&raw));
        }
        if text.contains(CURSOR_POSITION_REQUEST) {
            text = text.replace(CURSOR_POSITION_REQUEST, "");
            let _ = write_session(&map, &session_id, "\u{1b}[1;1R");
        }
        if !wrote_echo && Instant::now() > deadline - Duration::from_secs(12) {
            let _ = write_session(&map, &session_id, "echo gencore-alive\r");
            wrote_echo = true;
        }
        if text.contains("gencore-alive") {
            assert!(
                map.lock().expect("map").contains_key(&session_id),
                "session must remain in the map after echo"
            );
            let _ = std::fs::remove_dir_all(&dir);
            return;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    let _ = std::fs::remove_dir_all(&dir);
    panic!("no echo within 15s; output so far: {text:?}");
}

#[test]
fn resolve_oh_my_posh_resolves_all_theme_variants() {
    let temp = std::env::temp_dir().join(format!("gencore-pty-theme-test-{}", std::process::id()));
    let omp = temp.join("resources/oh-my-posh");
    std::fs::create_dir_all(&omp).unwrap();
    std::fs::write(omp.join("oh-my-posh.exe"), b"MZ").unwrap();
    std::fs::write(omp.join("gencore-prompt.ps1"), "# prompt\r\n").unwrap();
    std::fs::write(omp.join("gencore-polar-night.omp.json"), "{}").unwrap();
    std::fs::write(omp.join("gencore-snow-storm.omp.json"), "{}").unwrap();
    std::fs::write(omp.join("bubbles.omp.json"), "{}").unwrap();
    std::fs::write(omp.join("kali.omp.json"), "{}").unwrap();

    let polar = resolve_oh_my_posh(Some(&temp), Some("polar-night"), Some("gencore")).unwrap();
    assert_eq!(polar.theme, omp.join("gencore-polar-night.omp.json"));

    let snow = resolve_oh_my_posh(Some(&temp), Some("snow-storm"), None).unwrap();
    assert_eq!(snow.theme, omp.join("gencore-snow-storm.omp.json"));

    let bubbles = resolve_oh_my_posh(Some(&temp), None, Some("bubbles")).unwrap();
    assert_eq!(bubbles.theme, omp.join("bubbles.omp.json"));

    let kali = resolve_oh_my_posh(Some(&temp), Some("polar-night"), Some("kali")).unwrap();
    assert_eq!(kali.theme, omp.join("kali.omp.json"));

    // Fallback if requested theme is missing
    let missing = resolve_oh_my_posh(Some(&temp), Some("polar-night"), Some("wopian")).unwrap();
    assert_eq!(missing.theme, omp.join("gencore-polar-night.omp.json"));

    let _ = std::fs::remove_dir_all(&temp);
}

#[test]
fn resolve_custom_command_resolves_micro_from_resources() {
    let temp = std::env::temp_dir().join(format!("gencore-pty-micro-test-{}", std::process::id()));
    let micro_dir = temp.join("resources/micro");
    std::fs::create_dir_all(&micro_dir).unwrap();
    let micro_exe = micro_dir.join("micro.exe");
    std::fs::write(&micro_exe, b"MZ").unwrap();
    let settings = micro_dir.join("settings.json");
    std::fs::write(&settings, b"{\"diffgutter\":true}").unwrap();

    let launch =
        gencore_pty::resolve_custom_command(&["micro".into(), "Cargo.toml".into()], Some(&temp));
    assert_eq!(launch.program, micro_exe);
    assert_eq!(launch.args.len(), 3);
    assert_eq!(launch.args[0], "-config-dir");
    assert_eq!(launch.args[1], micro_dir.as_os_str());
    assert_eq!(launch.args[2], "Cargo.toml");

    let _ = std::fs::remove_dir_all(&temp);
}
