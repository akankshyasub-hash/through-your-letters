use sqlx::PgPool;
use std::sync::Arc;
use crate::{
    config::Config,
    infrastructure::{
        storage::traits::StorageService,
        ml::traits::MlService,
        queue::redis_queue::RedisQueue,
        repositories::{
            sqlx_lettering_repository::SqlxLetteringRepository,
            sqlx_social_repository::SqlxSocialRepository,
        },
    },
};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: redis::Client,
    pub storage: Arc<dyn StorageService>,
    pub ml_detector: Arc<dyn MlService>,
    pub queue: Arc<RedisQueue>,
    pub config: Config,
    pub lettering_repo: Arc<SqlxLetteringRepository>,
    pub social_repo: Arc<SqlxSocialRepository>,
}