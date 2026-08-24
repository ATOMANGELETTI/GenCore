pub mod theme_icon_api;
pub mod theme_icon_error;

pub use theme_icon_api::{
    MAIN_TRAY_ID, SetThemeIconArgs, ThemeName, app_theme_icons, set_theme_icon,
};
pub use theme_icon_error::ThemeIconError;
