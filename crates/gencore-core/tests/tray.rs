use gencore_core::{
    CoreError, PxRect, PxSize, TrayAction, TrayActionArgs, TrayError, tray_menu_origin,
};

#[test]
fn tray_action_args_round_trip_show() {
    let parsed: TrayActionArgs =
        serde_json::from_str(r#"{"action":"show"}"#).expect("show should deserialize");
    assert!(matches!(parsed.action, TrayAction::Show));

    let value = serde_json::to_value(parsed).expect("TrayActionArgs should serialize");
    assert_eq!(value, serde_json::json!({ "action": "show" }));
}

#[test]
fn tray_action_args_deserialize_hide_and_quit() {
    let hide: TrayActionArgs =
        serde_json::from_str(r#"{"action":"hide"}"#).expect("hide should deserialize");
    assert!(matches!(hide.action, TrayAction::Hide));

    let quit: TrayActionArgs =
        serde_json::from_str(r#"{"action":"quit"}"#).expect("quit should deserialize");
    assert!(matches!(quit.action, TrayAction::Quit));
}

#[test]
fn tray_action_args_reject_unknown_field() {
    let result: Result<TrayActionArgs, _> = serde_json::from_value(serde_json::json!({
        "action": "show",
        "unexpected": true,
    }));
    assert!(result.is_err());
}

#[test]
fn tray_action_args_reject_unknown_action() {
    let result: Result<TrayActionArgs, _> = serde_json::from_str(r#"{"action":"foo"}"#);
    assert!(result.is_err());
}

#[test]
fn tray_error_window_missing_converts_to_core_error() {
    let err: CoreError = TrayError::WindowMissing.into();
    assert_eq!(err.to_string(), "required window is missing");
}

#[test]
fn tray_menu_origin_centers_above_icon() {
    let icon = PxRect {
        x: 100,
        y: 900,
        width: 32,
        height: 32,
    };
    let menu = PxSize {
        width: 200,
        height: 140,
    };
    let work = PxRect {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
    };

    let (x, y) = tray_menu_origin(icon, menu, work);
    assert_eq!(x, 16);
    assert_eq!(y, 752);
}

#[test]
fn tray_menu_origin_clamps_to_work_origin() {
    let icon = PxRect {
        x: 0,
        y: 10,
        width: 32,
        height: 32,
    };
    let menu = PxSize {
        width: 200,
        height: 140,
    };
    let work = PxRect {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
    };

    let (x, y) = tray_menu_origin(icon, menu, work);
    assert_eq!(x, 0);
    assert_eq!(y, 0);
}

#[test]
fn tray_menu_origin_clamps_to_work_right_edge() {
    let icon = PxRect {
        x: 1900,
        y: 900,
        width: 32,
        height: 32,
    };
    let menu = PxSize {
        width: 200,
        height: 140,
    };
    let work = PxRect {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
    };

    let (x, y) = tray_menu_origin(icon, menu, work);
    assert_eq!(x, 1720);
    assert_eq!(y, 752);
}

#[test]
fn tray_menu_origin_clamps_to_second_monitor_work() {
    let icon = PxRect {
        x: 1920,
        y: 900,
        width: 32,
        height: 32,
    };
    let menu = PxSize {
        width: 200,
        height: 140,
    };
    let work = PxRect {
        x: 1920,
        y: 0,
        width: 1920,
        height: 1080,
    };

    let (x, y) = tray_menu_origin(icon, menu, work);
    assert_eq!(x, 1920);
    assert_eq!(y, 752);
}
