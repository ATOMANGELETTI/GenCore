use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use gencore_pty::{
    IoError, OpenArgs, SessionError, SessionMap, kill_session, spawn_session, write_session,
};

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
