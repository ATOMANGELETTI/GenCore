use tauri::{App, Wry};

/// One-time application setup, run before the main window is shown.
pub fn setup(app: &mut App<Wry>) -> Result<(), Box<dyn std::error::Error>> {
    gencore_core::init_logging()?;
    super::tray::setup(app)?;
    Ok(())
}
