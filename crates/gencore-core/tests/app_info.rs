use gencore_core::{AppInfo, AppInfoError, CoreError};

#[test]
fn app_info_serializes_with_expected_shape() {
    let info = AppInfo {
        name: "GenCore".into(),
        version: "0.1.0".into(),
        identifier: "com.gencore.app".into(),
    };

    let value = serde_json::to_value(&info).expect("AppInfo should serialize");
    assert_eq!(value["name"], "GenCore");
    assert_eq!(value["version"], "0.1.0");
    assert_eq!(value["identifier"], "com.gencore.app");
}

#[test]
fn app_info_round_trips_through_json() {
    let info = AppInfo {
        name: "GenCore".into(),
        version: "0.1.0".into(),
        identifier: "com.gencore.app".into(),
    };

    let json = serde_json::to_string(&info).expect("AppInfo should serialize");
    let round_tripped: AppInfo = serde_json::from_str(&json).expect("AppInfo should deserialize");
    assert_eq!(info, round_tripped);
}

#[test]
fn app_info_rejects_unknown_fields() {
    let json = serde_json::json!({
        "name": "GenCore",
        "version": "0.1.0",
        "identifier": "com.gencore.app",
        "unexpected": true,
    });

    let result: Result<AppInfo, _> = serde_json::from_value(json);
    assert!(result.is_err());
}

#[test]
fn core_error_is_typed_and_displays_a_message() {
    let err: CoreError = AppInfoError::IdentifierMissing.into();
    assert_eq!(err.to_string(), "application identifier is not configured");
}

#[test]
fn core_error_serializes_as_a_string() {
    let err: CoreError = AppInfoError::IdentifierMissing.into();
    let value = serde_json::to_value(&err).expect("CoreError should serialize");
    assert_eq!(
        value,
        serde_json::json!("application identifier is not configured")
    );
}
