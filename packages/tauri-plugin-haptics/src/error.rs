use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("plugin error: {0}")]
    Plugin(#[from] tauri::Error),
    #[error("haptics unsupported on this platform")]
    Unsupported,
    #[error("invalid request: {0}")]
    InvalidRequest(String),
}

pub type Result<T> = std::result::Result<T, Error>;
