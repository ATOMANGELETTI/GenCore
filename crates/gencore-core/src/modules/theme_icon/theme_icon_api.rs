use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime, image::Image};

use super::theme_icon_error::ThemeIconError;
use crate::modules::error::CoreError;

pub const MAIN_TRAY_ID: &str = "main-tray";

const TERMINAL_WINDOW_POLAR_NIGHT: &[u8] = include_bytes!(
    "../../../../../packages/ui-kit/src/assets/icons/favicon/terminal/favicon_polar-night.png"
);
const TERMINAL_WINDOW_SNOW_STORM: &[u8] = include_bytes!(
    "../../../../../packages/ui-kit/src/assets/icons/favicon/terminal/favicon_snow-storm.png"
);
const TERMINAL_TRAY_POLAR_NIGHT: &[u8] = include_bytes!(
    "../../../../../packages/ui-kit/src/assets/icons/favicon/terminal/favicon-alt_polar-night.png"
);
const TERMINAL_TRAY_SNOW_STORM: &[u8] = include_bytes!(
    "../../../../../packages/ui-kit/src/assets/icons/favicon/terminal/favicon-alt_snow-storm.png"
);

const EXPLORER_WINDOW_POLAR_NIGHT: &[u8] = include_bytes!(
    "../../../../../packages/ui-kit/src/assets/icons/favicon/explorer/favicon_polar-night.png"
);
const EXPLORER_WINDOW_SNOW_STORM: &[u8] = include_bytes!(
    "../../../../../packages/ui-kit/src/assets/icons/favicon/explorer/favicon_snow-storm.png"
);
const EXPLORER_TRAY_POLAR_NIGHT: &[u8] = include_bytes!(
    "../../../../../packages/ui-kit/src/assets/icons/favicon/explorer/favicon-alt_polar-night.png"
);
const EXPLORER_TRAY_SNOW_STORM: &[u8] = include_bytes!(
    "../../../../../packages/ui-kit/src/assets/icons/favicon/explorer/favicon-alt_snow-storm.png"
);

/// Theme names supported for dynamic icon switching.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ThemeName {
    PolarNight,
    SnowStorm,
}

/// IPC payload for [`set_theme_icon`]. Extra keys are rejected.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SetThemeIconArgs {
    pub theme: ThemeName,
}

/// Resolves high-contrast (window_png, tray_png) icon bytes for the given app and active theme.
///
/// Inverted contrast mapping:
/// - When Polar Night (dark) is active -> return Snow Storm (light) rasters.
/// - When Snow Storm (light) is active -> return Polar Night (dark) rasters.
pub fn app_theme_icons(identifier: &str, theme: ThemeName) -> (&'static [u8], &'static [u8]) {
    let is_explorer = identifier.contains("explorer");
    match (is_explorer, theme) {
        // Polar Night theme -> Snow Storm high-contrast icon
        (false, ThemeName::PolarNight) => (TERMINAL_WINDOW_SNOW_STORM, TERMINAL_TRAY_SNOW_STORM),
        // Snow Storm theme -> Polar Night high-contrast icon
        (false, ThemeName::SnowStorm) => (TERMINAL_WINDOW_POLAR_NIGHT, TERMINAL_TRAY_POLAR_NIGHT),
        // Explorer Polar Night theme -> Snow Storm high-contrast icon
        (true, ThemeName::PolarNight) => (EXPLORER_WINDOW_SNOW_STORM, EXPLORER_TRAY_SNOW_STORM),
        // Explorer Snow Storm theme -> Polar Night high-contrast icon
        (true, ThemeName::SnowStorm) => (EXPLORER_WINDOW_POLAR_NIGHT, EXPLORER_TRAY_POLAR_NIGHT),
    }
}

/// Dynamically updates the main window taskbar icon and system tray icon to contrast with the active theme.
#[tauri::command]
pub async fn set_theme_icon<R: Runtime>(
    app: AppHandle<R>,
    args: SetThemeIconArgs,
) -> Result<(), CoreError> {
    let identifier = app.config().identifier.as_str();
    let (window_bytes, tray_bytes) = app_theme_icons(identifier, args.theme);

    let window_image = Image::from_bytes(window_bytes)
        .map_err(|e| CoreError::ThemeIcon(ThemeIconError::Image(e.to_string())))?;
    let tray_image = Image::from_bytes(tray_bytes)
        .map_err(|e| CoreError::ThemeIcon(ThemeIconError::Image(e.to_string())))?;

    if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_icon(window_image);
    }

    if let Some(tray) = app.tray_by_id(MAIN_TRAY_ID) {
        let _ = tray.set_icon(Some(tray_image));
    }

    Ok(())
}
