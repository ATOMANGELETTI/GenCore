pub mod session_api;
pub mod session_error;
pub mod session_map;
pub mod session_shell;

pub use session_api::{CloseArgs, OpenArgs, OpenResult, close, open};
pub use session_error::SessionError;
pub use session_map::{
    PTY_DATA_EVENT, PTY_EXIT_EVENT, PtyDataPayload, PtyExitPayload, SessionMap, kill_session,
    spawn_session,
};
pub use session_shell::{
    OhMyPoshSpawn, ShellLaunch, is_real_executable, resolve_oh_my_posh, resolve_shell,
    shell_launch, strip_verbatim_prefix,
};
