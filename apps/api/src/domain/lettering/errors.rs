use thiserror::Error;
use ts_rs::TS;
use serde::{Serialize, Deserialize};

#[derive(Debug, Error, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum DomainError {
    #[error("Not found")]
    NotFound,
    #[error("Validation error: {0}")]
    ValidationError(String),
    #[error("Infrastructure error: {0}")]
    InfrastructureError(String),
    #[error("Rate limit exceeded")]
    RateLimitExceeded,
    #[error("Unauthorized")]
    Unauthorized,
}
