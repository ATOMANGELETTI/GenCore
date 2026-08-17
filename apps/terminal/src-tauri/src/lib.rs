//! GenCore Terminal desktop shell.
//!
//! Registers `gencore-core` (app metadata), `gencore-pty` (session stub), and
//! `gencore-fs` (Files-tab tree). Capabilities grant `get_app_info` and the
//! six file-tree `gencore-fs` commands; pty stubs stay ungranted.

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
