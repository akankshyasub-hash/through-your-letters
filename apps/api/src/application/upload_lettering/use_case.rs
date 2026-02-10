use crate::{
    application::upload_lettering::dto::UploadLetteringRequest,
    domain::lettering::{entity::*, repository::LetteringRepository},
    infrastructure::{
        geocoding::coordinates_for_pincode, queue::redis_queue::RedisQueue,
        storage::traits::StorageService,
    },
};
use bytes::Bytes;
use sha2::{Digest, Sha256};
use std::sync::Arc;
use uuid::Uuid;

pub struct UploadLetteringUseCase {
    repository: Box<dyn LetteringRepository>,
    storage: Arc<dyn StorageService>,
    queue: Arc<RedisQueue>,
}

impl UploadLetteringUseCase {
    pub fn new(
        repository: Box<dyn LetteringRepository>,
        storage: Arc<dyn StorageService>,
        queue: Arc<RedisQueue>,
    ) -> Self {
        Self {
            repository,
            storage,
            queue,
        }
    }

    pub async fn execute(&self, request: UploadLetteringRequest) -> Result<Lettering, String> {
        let image_hash = {
            let mut hasher = Sha256::new();
            hasher.update(&request.image_data);
            format!("{:x}", hasher.finalize())
        };

        if let Some(existing) = self
            .repository
            .find_by_image_hash(&image_hash)
            .await
            .map_err(|e| format!("Database error: {}", e))?
        {
            return Err(format!(
                "Duplicate image: this photo has already been uploaded (id: {})",
                existing.id
            ));
        }

        let lettering_id = Uuid::now_v7();

        // Convert original to WebP (max 1200px) for storage conservation
        let original_webp = Self::convert_to_webp(&request.image_data, 1200)?;
        let image_key = format!("letterings/{}.webp", lettering_id);

        let image_url = self
            .storage
            .upload(&image_key, original_webp, "image/webp")
            .await
            .map_err(|e| format!("Storage error: {}", e))?;

        let thumbnail_urls = self
            .generate_thumbnails(&request.image_data, &lettering_id)
            .await?;

        let lettering = Lettering {
            id: lettering_id,
            city_id: request.city_id,
            contributor_tag: request.contributor_tag,
            image_url,
            thumbnail_urls,
            location: {
                let (lng, lat) = coordinates_for_pincode(&request.pin_code);
                Coordinates {
                    r#type: "Point".to_string(),
                    coordinates: vec![lng, lat],
                }
            },
            pin_code: request.pin_code,
            detected_text: None,
            ml_metadata: None,
            description: request.description,
            is_lettering: true,
            status: LetteringStatus::Pending,
            likes_count: 0,
            comments_count: 0,
            uploaded_by_ip: request.uploaded_by_ip,
            image_hash: Some(image_hash),
            report_count: 0,
            report_reasons: vec![],
            cultural_context: None,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let saved = self
            .repository
            .create(&lettering)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        let _ = self
            .queue
            .enqueue_ml_job(crate::infrastructure::queue::redis_queue::MlJob {
                lettering_id,
                image_url: saved.image_url.clone(),
            })
            .await;

        Ok(saved)
    }

    fn convert_to_webp(image_data: &[u8], max_width: u32) -> Result<Vec<u8>, String> {
        use image::ImageFormat;
        use std::io::Cursor;

        let img =
            image::load_from_memory(image_data).map_err(|e| format!("Invalid image: {}", e))?;
        let resized = if img.width() > max_width {
            img.resize(max_width, max_width, image::imageops::FilterType::Lanczos3)
        } else {
            img
        };
        let mut buffer = Cursor::new(Vec::new());
        resized
            .write_to(&mut buffer, ImageFormat::WebP)
            .map_err(|e| format!("WebP conversion failed: {}", e))?;
        Ok(buffer.into_inner())
    }

    async fn generate_thumbnails(
        &self,
        image_data: &Bytes,
        id: &Uuid,
    ) -> Result<ThumbnailUrls, String> {
        // PRD sizes: small=200px (heatmap/matrix), medium=600px (gallery), large=1200px (zine view)
        let sizes = [("small", 200u32), ("medium", 600), ("large", 1200)];
        let img =
            image::load_from_memory(image_data).map_err(|e| format!("Invalid image: {}", e))?;

        let mut urls = vec![];

        for (size_name, width) in sizes {
            let resized = img.resize(width, width, image::imageops::FilterType::Lanczos3);
            let mut buffer = std::io::Cursor::new(Vec::new());
            resized
                .write_to(&mut buffer, image::ImageFormat::WebP)
                .map_err(|e| format!("Thumbnail generation failed: {}", e))?;

            let key = format!("thumbnails/{}/{}.webp", size_name, id);
            let url = self
                .storage
                .upload(&key, buffer.into_inner(), "image/webp")
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
