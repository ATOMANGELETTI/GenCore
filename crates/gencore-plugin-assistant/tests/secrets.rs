use gencore_assistant::{
    ALLOWED_MODELS, AssistantStore, DEFAULT_CONTEXT_LINES, DEFAULT_MODEL, IdentityProtector,
    SecretProtector, clamp_context_lines, parse_model,
};

#[test]
fn default_model_is_gemini_37_flash() {
    assert_eq!(DEFAULT_MODEL, "gemini-3.7-flash");
}

#[test]
fn parse_model_rejects_unknown() {
    assert!(parse_model("gpt-4").is_err());
    assert_eq!(
        parse_model("gemini-3.5-flash-lite").unwrap(),
        "gemini-3.5-flash-lite"
    );
}

#[test]
fn context_lines_only_accept_20_to_200() {
    assert_eq!(clamp_context_lines(80), Some(DEFAULT_CONTEXT_LINES));
    assert_eq!(clamp_context_lines(19), None);
    assert_eq!(clamp_context_lines(201), None);
}

#[test]
fn identity_protector_round_trips_and_store_never_keeps_plain_key_in_settings() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let protector = IdentityProtector;
    let blob = protector.protect(b"sk-test").unwrap();
    store.put_secret("gemini_api_key", &blob).unwrap();
    assert!(store.has_secret("gemini_api_key").unwrap());
    let restored = protector
        .unprotect(&store.get_secret("gemini_api_key").unwrap().unwrap())
        .unwrap();
    assert_eq!(restored, b"sk-test");
    assert!(store.get_setting("gemini_api_key").unwrap().is_none());
}

#[test]
fn clear_secret_removes_blob_without_writing_settings() {
    let dir = tempfile::tempdir().unwrap();
    let store = AssistantStore::open(&dir.path().join("db.sqlite")).unwrap();
    let blob = IdentityProtector.protect(b"sk-test").unwrap();
    store.put_secret("gemini_api_key", &blob).unwrap();
    store.clear_secret("gemini_api_key").unwrap();
    assert!(!store.has_secret("gemini_api_key").unwrap());
    assert!(store.get_secret("gemini_api_key").unwrap().is_none());
    assert!(store.get_setting("gemini_api_key").unwrap().is_none());
}

#[test]
fn parse_model_accepts_allowed_ids() {
    assert_eq!(
        ALLOWED_MODELS,
        &[
            "gemini-3.7-flash",
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.1-pro-preview",
        ]
    );
    for model in ALLOWED_MODELS {
        assert_eq!(parse_model(model).unwrap(), *model);
    }
}

#[cfg(windows)]
#[test]
fn dpapi_protector_round_trips() {
    use gencore_assistant::DpapiProtector;

    let protector = DpapiProtector;
    let blob = protector.protect(b"sk-test").unwrap();
    assert_ne!(blob.as_slice(), b"sk-test");
    let restored = protector.unprotect(&blob).unwrap();
    assert_eq!(restored, b"sk-test");
}

#[cfg(windows)]
#[test]
fn dpapi_unprotect_failure_is_unprotect() {
    use gencore_assistant::{DpapiProtector, SecretsError};

    let err = DpapiProtector.unprotect(b"not-a-dpapi-blob").unwrap_err();
    assert!(matches!(err, SecretsError::Unprotect));
    let display = err.to_string();
    let debug = format!("{err:?}");
    assert!(!display.contains("sk-test"));
    assert!(!debug.contains("sk-test"));
}
