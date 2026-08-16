use super::error_error::CoreError;

/// Convenience alias for fallible operations exposed by `gencore-core`.
pub type CoreResult<T> = Result<T, CoreError>;
