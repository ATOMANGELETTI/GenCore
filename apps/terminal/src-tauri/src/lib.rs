//! GenCore Terminal desktop shell.
//!
//! Registers the shared `gencore-core` (app metadata) and `gencore-pty`
//! (session stub) plugins. The frontend is only granted `gencore-core`'s
//! `get_app_info` command today; see `capabilities/main.json`.

mod modules;

use modules::setup::setup;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(gencore_core::init())
        .plugin(gencore_pty::init())
        .setup(setup)
        .run(tauri::generate_context!())
        .expect("error while running GenCore Terminal");
}
