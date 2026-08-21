use thiserror::Error;

use crate::modules::app_info::AppInfoError;
use crate::modules::pinned_store::PinnedStoreError;

/// Aggregated, typed error surfaced by `gencore-core` plugin commands.
///
/// Command handlers never return raw strings; each fallible module defines
/// its own error type and converts it into a [`CoreError`] variant.
#[derive(Debug, Error)]
pub enum CoreError {
    /// An error occurred while collecting application metadata.
    #[error(transparent)]
    AppInfo(#[from] AppInfoError),
    /// An error occurred while reading or writing pinned tabs.
    #[error(transparent)]
    PinnedStore(#[from] PinnedStoreError),
}

impl serde::Serialize for CoreError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
