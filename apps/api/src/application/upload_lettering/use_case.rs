use crate::{
    domain::lettering::{entity::*, errors::DomainError, repository::LetteringRepository},
    infrastructure::{storage::r2_storage_service::R2StorageService, queue::redis_queue::*},
};
use super::dto::UploadLetteringRequest;
use std::sync::Arc;
use uuid::Uuid;
use chrono::Utc;

pub struct UploadLetteringUseCase {
    repository: Box<dyn LetteringRepository>,
    storage: Arc<R2StorageService>,
    queue: Arc<RedisQueue>,
}

impl UploadLetteringUseCase {
    pub fn new(repository: Box<dyn LetteringRepository>, storage: Arc<R2StorageService>, queue: Arc<RedisQueue>) -> Self {
        Self { repository, storage, queue }
    }

    pub async fn execute(&self, request: UploadLetteringRequest) -> Result<Lettering, DomainError> {
        let lettering_id = Uuid::now_v7();
        let image_url = self.storage.upload_image(request.image_data.clone(), request.city_id, lettering_id, "image/jpeg")
            .await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;

        let lettering = Lettering {
            id: lettering_id,
            city_id: request.city_id,
            contributor_tag: request.contributor_tag,
            image_url: image_url.clone(),
            thumbnail_urls: ThumbnailUrls {
                small: format!("{}-small", image_url),
                medium: format!("{}-medium", image_url),
                large: format!("{}-large", image_url),
            },
            location: Coordinates { r#type: "Point".into(), coordinates: vec![77.5946, 12.9716] },
            pin_code: request.pin_code,
            detected_text: None,
            ml_metadata: None,
            is_lettering: true,
            status: LetteringStatus::Pending,
            likes_count: 0,
            comments_count: 0,
            uploaded_by_ip: request.uploaded_by_ip,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let created = self.repository.create(&lettering).await?;
        self.queue.enqueue_ml_job(MlJob { lettering_id: created.id, image_url }).await
            .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(created)
    }
}
