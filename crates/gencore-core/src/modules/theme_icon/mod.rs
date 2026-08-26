pub mod theme_icon_api;
pub mod theme_icon_error;
pub mod theme_icon_scale;
#[cfg(windows)]
pub mod theme_icon_win;

pub use theme_icon_api::{
    MAIN_TRAY_ID, SetThemeIconArgs, ThemeName, app_theme_icons, set_theme_icon,
};
pub use theme_icon_error::ThemeIconError;
pub use theme_icon_scale::{ICON_BIG_MAX_EDGE, ICON_SMALL_EDGE, scale_rgba_to_max_edge};
#[cfg(windows)]
pub use theme_icon_win::{ThemeIconState, apply_taskbar_icons, create_hicon_from_rgba};
