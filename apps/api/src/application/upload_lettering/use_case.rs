use std::sync::Arc;
use bytes::Bytes;
use uuid::Uuid;
use crate::{
    domain::lettering::{entity::*, repository::LetteringRepository},
    infrastructure::{
        storage::traits::StorageService,
        queue::redis_queue::RedisQueue,
    },
    application::upload_lettering::dto::UploadLetteringRequest,
};

pub struct UploadLetteringUseCase {
    repository: Box<dyn LetteringRepository>,
    storage: Arc<dyn StorageService>,
    queue: Arc<RedisQueue>,
}

impl UploadLetteringUseCase {
    pub fn new(
        repository: Box<dyn LetteringRepository>, 
        storage: Arc<dyn StorageService>,
        queue: Arc<RedisQueue>
    ) -> Self {
        Self { repository, storage, queue }
    }
    
    pub async fn execute(&self, request: UploadLetteringRequest) -> Result<Lettering, String> {
        let lettering_id = Uuid::now_v7();
        let image_key = format!("letterings/{}.jpg", lettering_id);
        
        let image_url = self.storage
            .upload(&image_key, request.image_data.to_vec(), "image/jpeg")
            .await
            .map_err(|e| format!("Storage error: {}", e))?;
        
        let thumbnail_urls = self.generate_thumbnails(&request.image_data, &lettering_id).await?;
        
        let lettering = Lettering {
            id: lettering_id,
            city_id: request.city_id,
            contributor_tag: request.contributor_tag,
            image_url,
            thumbnail_urls,
            location: Coordinates {
                r#type: "Point".to_string(),
                coordinates: vec![77.5946, 12.9716],
            },
            pin_code: request.pin_code,
            detected_text: None,
            ml_metadata: None,
            is_lettering: true,
            status: LetteringStatus::Pending,
            likes_count: 0,
            comments_count: 0,
            uploaded_by_ip: request.uploaded_by_ip,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };
        
        let saved = self.repository.create(&lettering).await
            .map_err(|e| format!("Database error: {}", e))?;
        
        let _ = self.queue.enqueue_ml_job(crate::infrastructure::queue::redis_queue::MlJob {
            lettering_id,
            image_url: saved.image_url.clone(),
        }).await;
        
        Ok(saved)
    }
    
    async fn generate_thumbnails(&self, image_data: &Bytes, id: &Uuid) -> Result<ThumbnailUrls, String> {
        use image::ImageFormat;
        use std::io::Cursor;
        
        let img = image::load_from_memory(image_data)
            .map_err(|e| format!("Invalid image: {}", e))?;
        
        let sizes = [
            ("small", 200),
            ("medium", 400),
            ("large", 800),
        ];
        
        let mut urls = vec![];
        
        for (size_name, width) in sizes {
            let resized = img.resize(width, width, image::imageops::FilterType::Lanczos3);
            let mut buffer = Cursor::new(Vec::new());
            resized.write_to(&mut buffer, ImageFormat::Jpeg)
                .map_err(|e| format!("Thumbnail generation failed: {}", e))?;
            
            let key = format!("thumbnails/{}/{}.jpg", size_name, id);
            let url = self.storage
                .upload(&key, buffer.into_inner(), "image/jpeg")
                .await
                .map_err(|e| format!("Thumbnail upload failed: {}", e))?;
            
            urls.push(url);
        }
        
        Ok(ThumbnailUrls {
            small: urls[0].clone(),
            medium: urls[1].clone(),
            large: urls[2].clone(),
        })
    }
}