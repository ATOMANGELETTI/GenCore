use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use gencore_pty::{
    IoError, OpenArgs, SessionError, SessionMap, kill_session, resolve_oh_my_posh, spawn_session,
    write_session,
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

struct KillOnDrop {
    map: Arc<Mutex<SessionMap>>,
    session_id: String,
}

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
    assert!(resolve_oh_my_posh(None, None).is_none());
    assert!(resolve_oh_my_posh(None, Some("snow-storm")).is_none());
}

#[test]
fn resolve_oh_my_posh_none_when_exe_or_script_missing() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-omp-missing-{}", std::process::id()));
    let omp = dir.join("oh-my-posh");
    std::fs::create_dir_all(&omp).unwrap();
    std::fs::write(omp.join("gencore-prompt.ps1"), "#").unwrap();
    assert!(resolve_oh_my_posh(Some(&dir), None).is_none());
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn resolve_oh_my_posh_uses_absolute_theme_json() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-omp-ok-{}", std::process::id()));
    let omp = dir.join("oh-my-posh");
    std::fs::create_dir_all(&omp).unwrap();
    std::fs::write(omp.join("oh-my-posh.exe"), []).unwrap();
    std::fs::write(omp.join("gencore-prompt.ps1"), "#").unwrap();
    std::fs::write(omp.join("gencore-polar-night.omp.json"), "{}").unwrap();
    std::fs::write(omp.join("gencore-snow-storm.omp.json"), "{}").unwrap();

    let polar = resolve_oh_my_posh(Some(&dir), Some("polar-night")).expect("polar-night");
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

    let snow = resolve_oh_my_posh(Some(&dir), Some("snow-storm")).expect("snow-storm");
    assert!(snow.theme.ends_with("gencore-snow-storm.omp.json"));

    let omitted = resolve_oh_my_posh(Some(&dir), None).expect("default polar-night");
    assert!(omitted.theme.ends_with("gencore-polar-night.omp.json"));

    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn resolve_oh_my_posh_accepts_resources_subdirectory() {
    let dir = std::env::temp_dir().join(format!("gencore-pty-omp-nested-{}", std::process::id()));
    let nested = dir.join("resources").join("oh-my-posh");
    std::fs::create_dir_all(&nested).unwrap();
    std::fs::write(nested.join("oh-my-posh.exe"), []).unwrap();
    std::fs::write(nested.join("gencore-prompt.ps1"), "#").unwrap();
    std::fs::write(nested.join("gencore-polar-night.omp.json"), "{}").unwrap();

    let resolved = resolve_oh_my_posh(Some(&dir), None).expect("nested resources");
    assert!(resolved.theme.ends_with("gencore-polar-night.omp.json"));

    let _ = std::fs::remove_dir_all(&dir);
}
