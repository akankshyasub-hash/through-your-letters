use crate::infrastructure::{storage::r2_storage_service::R2StorageService, ml::text_detector::TextDetector, queue::redis_queue::RedisQueue};
use sqlx::PgPool;
use std::{sync::Arc, time::Duration};

pub struct MlProcessor {
    db: PgPool,
    storage: Arc<R2StorageService>,
    detector: Arc<TextDetector>,
    queue: Arc<RedisQueue>,
}

impl MlProcessor {
    pub fn new(db: PgPool, storage: Arc<R2StorageService>, detector: Arc<TextDetector>, queue: Arc<RedisQueue>) -> Self {
        Self { db, storage, detector, queue }
    }

    pub async fn start(&self) {
        tracing::info!("ML Processor worker active. Monitoring Redis queue.");
        loop {
            match self.queue.dequeue_ml_job().await {
                Ok(Some(job)) => {
                    tracing::info!("Processing ML job for lettering {}", job.lettering_id);
                    // Process job here
                }
                Ok(None) => tokio::time::sleep(Duration::from_secs(1)).await,
                Err(e) => tracing::error!("Queue error: {:?}", e),
            }
        }
    }
}
