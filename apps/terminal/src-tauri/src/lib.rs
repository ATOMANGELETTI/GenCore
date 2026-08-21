//! GenCore Terminal desktop shell.
//!
//! Registers `gencore-core` (app metadata), `gencore-pty` (ConPTY sessions),
//! and `gencore-fs` (Files-tab tree). Capabilities grant `get_app_info`, the
//! pinned-tab load/save pair, the six file-tree `gencore-fs` commands, and the
//! four `gencore-pty` commands the terminal invokes.

mod modules;

use modules::setup::setup;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(gencore_core::init())
        .plugin(gencore_pty::init())
        .plugin(gencore_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(setup)
        .run(tauri::generate_context!())
        .expect("error while running GenCore Terminal");
}
