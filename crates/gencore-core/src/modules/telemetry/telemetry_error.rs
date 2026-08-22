use thiserror::Error;

#[derive(Debug, Error)]
pub enum TelemetryError {
    #[error("failed to collect telemetry: {0}")]
    CollectionFailed(String),
    #[error("telemetry collector lock poisoned")]
    LockPoisoned,
}
