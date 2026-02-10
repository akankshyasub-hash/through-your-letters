use crate::infrastructure::{
    ml::onnx_text_detector::OnnxTextDetector, ml::traits::MlService,
    queue::redis_queue::RedisQueue, storage::r2_storage_service::R2StorageService,
};
use sqlx::PgPool;
use std::{sync::Arc, time::Duration};

pub struct MlProcessor {
    db: PgPool,
    storage: Arc<R2StorageService>,
    detector: Arc<OnnxTextDetector>,
    queue: Arc<RedisQueue>,
}

impl MlProcessor {
    pub fn new(
        db: PgPool,
        storage: Arc<R2StorageService>,
        detector: Arc<OnnxTextDetector>,
        queue: Arc<RedisQueue>,
    ) -> Self {
        Self {
            db,
            storage,
            detector,
            queue,
        }
    }

    pub async fn start(&self) {
        tracing::info!("ML Processor worker active. Monitoring Redis queue.");
        let client = reqwest::Client::new();

        loop {
            match self.queue.dequeue_ml_job().await {
                Ok(Some(job)) => {
                    tracing::info!("🧠 Processing ML job for lettering {}", job.lettering_id);

                    let response = client.get(&job.image_url).send().await;

                    let image_bytes = match response {
                        Ok(resp) if resp.status() == 404 => {
                            tracing::warn!(
                                "🗑️ Image missing in R2 for {}, cleaning up DB",
                                job.lettering_id
                            );
                            let _ = sqlx::query!(
                                "DELETE FROM letterings WHERE id = $1",
                                job.lettering_id
                            )
                            .execute(&self.db)
                            .await;
                            continue;
                        }
                        Ok(resp) => resp.bytes().await.unwrap_or_default(),
                        Err(e) => {
                            tracing::error!("Network error fetching image: {}", e);
                            continue;
                        }
                    };

                    let detection_result = self.detector.detect_text(&image_bytes).await;

                    let (text, status) = match detection_result {
                        Ok(res) => (Some(res.detected_text), "APPROVED"),
                        Err(e) => {
                            tracing::error!("ML Detection failed: {}", e);
                            (None, "PENDING")
                        }
                    };

                    let update_result = sqlx::query!(
                        "UPDATE letterings SET detected_text = $1, status = $2, updated_at = NOW() WHERE id = $3",
                        text,
                        status,
                        job.lettering_id
                    )
                    .execute(&self.db)
                    .await;

                    match update_result {
                        Ok(_) => tracing::info!(
                            "✅ Successfully processed lettering {}",
                            job.lettering_id
                        ),
                        Err(e) => tracing::error!(
                            "Failed to update DB for lettering {}: {}",
                            job.lettering_id,
                            e
                        ),
                    }
                }
                Ok(None) => tokio::time::sleep(Duration::from_secs(1)).await,
                Err(e) => {
                    tracing::debug!("Queue poll error (expected when idle): {:?}", e);
                    tokio::time::sleep(Duration::from_secs(2)).await;
                }
            }
        }
    }
}
