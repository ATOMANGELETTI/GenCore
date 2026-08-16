use tauri::{App, Runtime};

/// App bootstrap hook, wired via [`tauri::Builder::setup`].
///
/// Kept in its own module (mirroring the shared crates' `{module}/mod.rs`
/// layout) so app-level startup logic has a stable home as it grows beyond
/// diagnostics initialization.
pub fn run_setup<R: Runtime>(app: &mut App<R>) -> Result<(), Box<dyn std::error::Error>> {
    gencore_core::init_logging()?;
    let _ = app;
    Ok(())
}
