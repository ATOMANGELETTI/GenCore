use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use portable_pty::{Child, ChildKiller, CommandBuilder, MasterPty, PtySize, native_pty_system};
use serde::Serialize;
use uuid::Uuid;

use super::session_api::OpenArgs;
use super::session_error::SessionError;
use super::session_shell::resolve_shell;

/// Event name for raw pty output chunks (standard base64).
pub const PTY_DATA_EVENT: &str = "gencore-pty://data";

/// Event name for pty child-process exit.
pub const PTY_EXIT_EVENT: &str = "gencore-pty://exit";

/// Payload for [`PTY_DATA_EVENT`].
#[derive(Debug, Clone, Serialize)]
pub struct PtyDataPayload {
    /// Session that produced the chunk.
    pub session_id: String,
    /// Standard-base64 encoding of the raw byte chunk.
    pub data: String,
}

/// Payload for [`PTY_EXIT_EVENT`].
#[derive(Debug, Clone, Serialize)]
pub struct PtyExitPayload {
    /// Session that exited.
    pub session_id: String,
    /// Process exit code, or `None` if unknown.
    pub code: Option<i32>,
}

/// Live pty session handles.
pub struct PtySession {
    pub(crate) writer: Mutex<Box<dyn Write + Send>>,
    pub(crate) master: Box<dyn MasterPty + Send>,
    killer: Mutex<Box<dyn ChildKiller + Send + Sync>>,
    reader: Mutex<Option<JoinHandle<()>>>,
}

impl PtySession {
    pub(crate) fn kill_child(&self) {
        if let Ok(mut killer) = self.killer.lock() {
            let _ = killer.kill();
        }
    }

    pub(crate) fn take_reader(&self) -> Option<JoinHandle<()>> {
        self.reader.lock().ok().and_then(|mut handle| handle.take())
    }
}

impl Drop for PtySession {
    fn drop(&mut self) {
        self.kill_child();
    }
}

/// Sessions keyed by UUID string.
pub type SessionMap = HashMap<String, PtySession>;

/// Spawns a shell into a new pty and starts a reader thread.
pub fn spawn_session(
    map: &Arc<Mutex<SessionMap>>,
    args: OpenArgs,
    on_data: impl Fn(PtyDataPayload) + Send + 'static,
    on_exit: impl Fn(PtyExitPayload) + Send + 'static,
) -> Result<String, SessionError> {
    validate_theme(args.theme.as_deref())?;
    let cwd = resolve_cwd(args.cwd.as_deref())?;

    let pair = native_pty_system()
        .openpty(PtySize {
            rows: args.rows,
            cols: args.cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|err| SessionError::SpawnFailed(err.to_string()))?;

    let mut cmd = CommandBuilder::new(resolve_shell());
    cmd.arg("-NoLogo");
    if let Some(cwd) = cwd {
        cmd.cwd(cwd);
    }

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|err| SessionError::SpawnFailed(err.to_string()))?;

    let reader = match pair.master.try_clone_reader() {
        Ok(reader) => reader,
        Err(err) => {
            let mut killer = child.clone_killer();
            let _ = killer.kill();
            return Err(SessionError::SpawnFailed(err.to_string()));
        }
    };
    let writer = match pair.master.take_writer() {
        Ok(writer) => writer,
        Err(err) => {
            let mut killer = child.clone_killer();
            let _ = killer.kill();
            return Err(SessionError::SpawnFailed(err.to_string()));
        }
    };

    let mut fallback_killer = child.clone_killer();
    let killer = child.clone_killer();
    let session_id = Uuid::new_v4().to_string();
    let session_id_for_reader = session_id.clone();

    let handle = match std::thread::Builder::new()
        .name(format!("gencore-pty-{session_id}"))
        .spawn(move || {
            read_output(reader, session_id_for_reader, child, on_data, on_exit);
        }) {
        Ok(handle) => handle,
        Err(err) => {
            let _ = fallback_killer.kill();
            return Err(SessionError::SpawnFailed(err.to_string()));
        }
    };

    map.lock().expect("session map mutex").insert(
        session_id.clone(),
        PtySession {
            writer: Mutex::new(writer),
            master: pair.master,
            killer: Mutex::new(killer),
            reader: Mutex::new(Some(handle)),
        },
    );

    Ok(session_id)
}

/// Kills the child, joins the reader, and removes the session.
pub fn kill_session(map: &Arc<Mutex<SessionMap>>, session_id: &str) -> Result<(), SessionError> {
    let session = {
        let mut map = map.lock().expect("session map mutex");
        map.remove(session_id)
            .ok_or(SessionError::SessionNotFound)?
    };
    session.kill_child();
    let reader = session.take_reader();
    drop(session);
    if let Some(handle) = reader {
        let _ = handle.join();
    }
    Ok(())
}

fn validate_theme(theme: Option<&str>) -> Result<(), SessionError> {
    match theme {
        None | Some("polar-night") | Some("snow-storm") => Ok(()),
        Some(_) => Err(SessionError::InvalidTheme),
    }
}

fn resolve_cwd(cwd: Option<&str>) -> Result<Option<PathBuf>, SessionError> {
    match cwd {
        Some(path) => {
            if Path::new(path).is_dir() {
                Ok(Some(PathBuf::from(path)))
            } else {
                Err(SessionError::InvalidCwd)
            }
        }
        None => Ok(std::env::var("USERPROFILE").ok().map(PathBuf::from)),
    }
}

fn read_output(
    mut reader: Box<dyn Read + Send>,
    session_id: String,
    mut child: Box<dyn Child + Send + Sync>,
    on_data: impl Fn(PtyDataPayload),
    on_exit: impl Fn(PtyExitPayload),
) {
    let mut buf = [0u8; 8192];
    loop {
        match reader.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => {
                on_data(PtyDataPayload {
                    session_id: session_id.clone(),
                    data: STANDARD.encode(&buf[..n]),
                });
            }
            Err(_) => break,
        }
    }
    drop(reader);
    let code = child.wait().ok().map(|status| status.exit_code() as i32);
    on_exit(PtyExitPayload { session_id, code });
}
