use thiserror::Error;

/// Errors from protecting or unprotecting secret blobs.
///
/// Variants are unit-only so Display/Debug cannot leak key material.
#[derive(Debug, Error)]
pub enum SecretsError {
    /// `CryptProtectData` (or the identity mock) failed.
    #[error("failed to protect secret")]
    Protect,
    /// `CryptUnprotectData` failed for this user or blob.
    #[error("failed to unprotect secret")]
    Unprotect,
}

impl serde::Serialize for SecretsError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
