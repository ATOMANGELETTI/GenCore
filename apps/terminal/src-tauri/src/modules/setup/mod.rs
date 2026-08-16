use tauri::{App, Wry};

/// One-time application setup, run before the main window is shown.
pub fn setup(_app: &mut App<Wry>) -> Result<(), Box<dyn std::error::Error>> {
    gencore_core::init_logging()?;
    Ok(())
}
