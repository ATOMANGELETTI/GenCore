use gencore_core::{CoreError, SetThemeIconArgs, ThemeIconError, ThemeName, app_theme_icons};

#[test]
fn set_theme_icon_args_round_trip() {
    let parsed: SetThemeIconArgs =
        serde_json::from_str(r#"{"theme":"polar-night"}"#).expect("polar-night should deserialize");
    assert_eq!(parsed.theme, ThemeName::PolarNight);

    let value = serde_json::to_value(parsed).expect("SetThemeIconArgs should serialize");
    assert_eq!(value, serde_json::json!({ "theme": "polar-night" }));

    let snow: SetThemeIconArgs =
        serde_json::from_str(r#"{"theme":"snow-storm"}"#).expect("snow-storm should deserialize");
    assert_eq!(snow.theme, ThemeName::SnowStorm);
}

#[test]
fn set_theme_icon_args_reject_unknown_field() {
    let result: Result<SetThemeIconArgs, _> = serde_json::from_value(serde_json::json!({
        "theme": "polar-night",
        "extra": true,
    }));
    assert!(result.is_err());
}

#[test]
fn set_theme_icon_args_reject_unknown_theme() {
    let result: Result<SetThemeIconArgs, _> = serde_json::from_str(r#"{"theme":"dracula"}"#);
    assert!(result.is_err());
}

#[test]
fn theme_icon_error_converts_to_core_error() {
    let err: CoreError = ThemeIconError::WindowMissing.into();
    assert_eq!(err.to_string(), "main window is missing");

    let img_err: CoreError = ThemeIconError::Image("bad png".into()).into();
    assert_eq!(img_err.to_string(), "failed to decode icon image: bad png");
}

#[test]
fn theme_icon_contrast_mapping_terminal() {
    // Polar Night theme -> Snow Storm high-contrast icons
    let (window_bytes, tray_bytes) = app_theme_icons("com.gencore.terminal", ThemeName::PolarNight);
    assert!(!window_bytes.is_empty());
    assert!(!tray_bytes.is_empty());

    // Snow Storm theme -> Polar Night high-contrast icons
    let (window_bytes_ss, tray_bytes_ss) =
        app_theme_icons("com.gencore.terminal", ThemeName::SnowStorm);
    assert!(!window_bytes_ss.is_empty());
    assert!(!tray_bytes_ss.is_empty());
    assert_ne!(window_bytes, window_bytes_ss);
    assert_ne!(tray_bytes, tray_bytes_ss);
}

#[test]
fn theme_icon_contrast_mapping_explorer() {
    let (window_bytes_pn, tray_bytes_pn) =
        app_theme_icons("com.gencore.explorer", ThemeName::PolarNight);
    let (window_bytes_ss, tray_bytes_ss) =
        app_theme_icons("com.gencore.explorer", ThemeName::SnowStorm);
    assert!(!window_bytes_pn.is_empty());
    assert!(!tray_bytes_pn.is_empty());
    assert!(!window_bytes_ss.is_empty());
    assert!(!tray_bytes_ss.is_empty());
    assert_ne!(window_bytes_pn, window_bytes_ss);
    assert_ne!(tray_bytes_pn, tray_bytes_ss);
}
