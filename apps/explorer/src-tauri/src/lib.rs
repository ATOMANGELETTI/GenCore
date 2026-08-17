//! GenCore Explorer — standalone Tauri 2 + Vite + React template app.
//!
//! Registers the shared `gencore-core` (app info) and `gencore-fs` (stub
//! filesystem) plugins. `gencore-fs` is registered but is granted no
//! permissions in `capabilities/main.json`; the crate is wired up so future
//! Explorer features can opt in per-command without touching this file.

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
