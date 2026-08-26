//! GenCore Browser — standalone Tauri 2 + Vite + React web browser app.
//!
//! Registers the shared `gencore-core` (app info) and `gencore-browser`
//! (multiwebview tab management, downloads, bookmarks/history/downloads storage)
//! plugins. See `capabilities/main.json` for the exact commands granted to the UI.

mod modules;

use modules::setup::run_setup;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(gencore_core::init())
        .plugin(gencore_browser::init())
        .plugin(tauri_plugin_opener::init())
        .setup(run_setup)
        .run(tauri::generate_context!())
        .expect("error while running the gencore-browser application");
}
