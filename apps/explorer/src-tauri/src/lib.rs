//! GenCore Explorer — standalone Tauri 2 + Vite + React file explorer app.
//!
//! Registers the shared `gencore-core` (app info) and `gencore-fs`
//! (filesystem: list/stat/create/rename/delete/copy/move/watch) plugins. See
//! `capabilities/main.json` for the exact commands granted to the UI.

mod modules;

use modules::setup::run_setup;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(gencore_core::init())
        .plugin(gencore_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(run_setup)
        .run(tauri::generate_context!())
        .expect("error while running the gencore-explorer application");
}
