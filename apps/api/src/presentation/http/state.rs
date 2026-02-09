use crate::{config::Config, infrastructure::{storage::r2_storage_service::R2StorageService, ml::text_detector::TextDetector, queue::redis_queue::RedisQueue}};
use sqlx::PgPool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: redis::Client,
    pub storage: Arc<R2StorageService>,
    pub ml_detector: Option<Arc<TextDetector>>,
    pub queue: Arc<RedisQueue>,
    pub config: Arc<Config>,
}
