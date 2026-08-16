use super::logging_error::LoggingError;

/// Placeholder hook for initializing structured diagnostics.
///
/// GenCore intentionally avoids pulling in a logging/tracing runtime
/// dependency until a concrete need arises. This function is a no-op today
/// and always succeeds; it exists so callers have a stable extension point
/// once a real backend is wired up.
pub fn init_logging() -> Result<(), LoggingError> {
    Ok(())
}
