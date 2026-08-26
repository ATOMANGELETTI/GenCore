use gencore_core::{
    CoreError, ICON_BIG_MAX_EDGE, ICON_SMALL_EDGE, SetThemeIconArgs, ThemeIconError, ThemeName,
    app_theme_icons, scale_rgba_to_max_edge,
};

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

    let window_err: CoreError = ThemeIconError::WindowIcon("denied".into()).into();
    assert_eq!(
        window_err.to_string(),
        "failed to apply window icon: denied"
    );

    let taskbar_err: CoreError = ThemeIconError::TaskbarIcon("createicon".into()).into();
    assert_eq!(
        taskbar_err.to_string(),
        "failed to apply taskbar icon: createicon"
    );

    let tray_err: CoreError = ThemeIconError::TrayIcon("missing png".into()).into();
    assert_eq!(tray_err.to_string(), "failed to apply tray icon: missing png");

    let rgba_err: CoreError = ThemeIconError::InvalidRgba.into();
    assert_eq!(rgba_err.to_string(), "invalid icon rgba buffer");
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

fn solid_rgba(width: u32, height: u32, r: u8, g: u8, b: u8, a: u8) -> Vec<u8> {
    let mut pixels = Vec::with_capacity((width * height * 4) as usize);
    for _ in 0..(width * height) {
        pixels.extend_from_slice(&[r, g, b, a]);
    }
    pixels
}

#[test]
fn scale_rgba_rejects_mismatched_buffer() {
    let err = scale_rgba_to_max_edge(&[0, 1, 2], 2, 2, 32).expect_err("len mismatch");
    assert_eq!(err.to_string(), "invalid icon rgba buffer");
}

#[test]
fn scale_rgba_keeps_buffer_when_already_within_max_edge() {
    let src = solid_rgba(4, 4, 10, 20, 30, 255);
    let (out, width, height) = scale_rgba_to_max_edge(&src, 4, 4, 32).expect("scale");
    assert_eq!((width, height), (4, 4));
    assert_eq!(out, src);
}

#[test]
fn scale_rgba_downscales_to_max_edge_with_nearest_neighbor() {
    let src = solid_rgba(4, 4, 10, 20, 30, 255);
    let (out, width, height) = scale_rgba_to_max_edge(&src, 4, 4, 2).expect("scale");
    assert_eq!((width, height), (2, 2));
    assert_eq!(out, solid_rgba(2, 2, 10, 20, 30, 255));
    assert_eq!(ICON_BIG_MAX_EDGE, 256);
    assert_eq!(ICON_SMALL_EDGE, 32);
}

#[cfg(windows)]
#[test]
fn hicon_from_rgba_creates_a_valid_icon() {
    use gencore_core::hicon_from_rgba;
    use windows::Win32::UI::WindowsAndMessaging::DestroyIcon;

    let src = solid_rgba(32, 32, 46, 52, 64, 255);
    let icon = hicon_from_rgba(&src, 32, 32).expect("CreateIcon");
    unsafe {
        DestroyIcon(icon).expect("DestroyIcon");
    }
}
