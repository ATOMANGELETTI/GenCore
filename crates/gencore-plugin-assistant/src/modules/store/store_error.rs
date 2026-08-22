use thiserror::Error;

#[derive(Debug, Error)]
pub enum StoreError {
    #[error("assistant data directory is unavailable")]
    DataDir,
    #[error("{0}")]
    Sqlite(String),
}

impl serde::Serialize for StoreError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
