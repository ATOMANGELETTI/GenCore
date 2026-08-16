use thiserror::Error;

/// Errors that can occur while configuring diagnostics for `gencore-core`.
///
/// This type is currently uninhabited: [`init_logging`](super::init_logging)
/// has no fallible path yet. It exists so a future tracing/logging backend
/// can report typed errors instead of adding a breaking API change.
#[derive(Debug, Error)]
pub enum LoggingError {}
