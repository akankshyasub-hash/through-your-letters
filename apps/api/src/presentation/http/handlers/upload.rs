use crate::{
    domain::lettering::repository::LetteringRepository,
    infrastructure::queue::redis_queue::MlJob,
    presentation::http::{errors::AppError, state::AppState},
};
use axum::{
    Json,
    extract::{Multipart, State},
    http::HeaderMap,
};
use image::{ImageFormat, imageops::FilterType};
use sha2::{Digest, Sha256};
use sqlx::types::ipnetwork::IpNetwork;
use std::{io::Cursor, str::FromStr};
use uuid::Uuid;

fn extract_client_ip(headers: &HeaderMap) -> Option<IpNetwork> {
    let raw = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(str::trim)
                .filter(|s| !s.is_empty())
        });

    raw.and_then(|ip| IpNetwork::from_str(ip).ok())
}

async fn approve_without_ml(
    state: &AppState,
    lettering_id: Uuid,
    fallback_text: &str,
) -> Result<(), AppError> {
    sqlx::query(
        "UPDATE letterings SET detected_text = $1, status = 'APPROVED', updated_at = NOW() WHERE id = $2",
    )
    .bind(fallback_text)
    .bind(lettering_id)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::InternalError(format!("Auto-approval failed: {}", e)))?;

    let _ = state
        .ws_broadcaster
        .send(serde_json::json!({ "type": "PROCESSED", "id": lettering_id }).to_string());
    Ok(())
}

pub async fn upload_lettering(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, AppError> {
    let mut image_data = None;
    let mut contributor = String::new();
    let mut pin = String::new();
    let mut desc = None;
    let mut city_id = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| AppError::BadRequest("Field error".into()))?
    {
        match field.name().unwrap_or("") {
            "image" => {
                image_data = Some(
                    field
                        .bytes()
                        .await
                        .map_err(|_| AppError::BadRequest("Byte error".into()))?,
                )
            }
            "contributor_tag" => contributor = field.text().await.unwrap_or_default(),
            "pin_code" => pin = field.text().await.unwrap_or_default(),
            "description" => desc = Some(field.text().await.unwrap_or_default()),
            "city_id" => city_id = Some(field.text().await.unwrap_or_default()),
            _ => {}
        }
    }

    let contributor = contributor.trim().to_string();
    if contributor.is_empty() {
        return Err(AppError::BadRequest("Contributor tag required".into()));
    }

    let pin = pin.trim().to_string();
    if pin.len() != 6 || !pin.chars().all(|c| c.is_ascii_digit()) {
        return Err(AppError::BadRequest("pin_code must be 6 digits".into()));
    }

    let desc = desc.and_then(|d| {
        let trimmed = d.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });

    let data = image_data.ok_or(AppError::BadRequest("Missing image".into()))?;

    // Virus Scanning
    let is_safe = state
        .virus_scanner
        .scan(&data)
        .await
        .map_err(|e| AppError::InternalError(format!("Scanner failure: {}", e)))?;

    if !is_safe {
        return Err(AppError::Forbidden(
            "Security threat detected in file".into(),
        ));
    }

    let id = Uuid::now_v7();
    let img = image::load_from_memory(&data)
        .map_err(|_| AppError::BadRequest("Invalid image format".into()))?;

    // Process Original
    let mut buf = Cursor::new(Vec::new());
    img.resize(1200, 1200, FilterType::Lanczos3)
        .write_to(&mut buf, ImageFormat::WebP)
        .unwrap();
    let image_bytes = buf.into_inner();

    // Hash Check for Duplicates
    let mut hasher = Sha256::new();
    hasher.update(&image_bytes);
    let image_hash = format!("{:x}", hasher.finalize());

    if state
        .lettering_repo
        .find_by_image_hash(&image_hash)
        .await?
        .is_some()
    {
        return Err(AppError::BadRequest(
            "This exact image has already been archived".into(),
        ));
    }

    let image_url = state
        .storage
        .upload(
            &format!("letterings/{}.webp", id),
            image_bytes,
            "image/webp",
        )
        .await?;

    // Generate Thumbnail
    let mut thumb_buf = Cursor::new(Vec::new());
    img.thumbnail(400, 400)
        .write_to(&mut thumb_buf, ImageFormat::WebP)
        .unwrap();
    let thumb_url = state
        .storage
        .upload(
            &format!("thumbs/{}.webp", id),
            thumb_buf.into_inner(),
            "image/webp",
        )
        .await?;

    let city_id = city_id
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .map(Uuid::parse_str)
        .transpose()
        .map_err(|_| AppError::BadRequest("Invalid city_id".into()))?
        .unwrap_or_else(|| Uuid::parse_str("0194f123-4567-7abc-8def-0123456789ab").unwrap());

    let lettering = crate::domain::lettering::entity::Lettering {
        id,
        city_id,
        contributor_tag: contributor,
        image_url: image_url.clone(),
        thumbnail_urls: crate::domain::lettering::entity::ThumbnailUrls {
            small: thumb_url.clone(),
            medium: thumb_url.clone(),
            large: image_url.clone(),
        },
        location: crate::domain::lettering::entity::Coordinates {
            r#type: "Point".into(),
            coordinates: vec![77.5946, 12.9716],
        },
        pin_code: pin,
        description: desc,
        image_hash: Some(image_hash),
        uploaded_by_ip: extract_client_ip(&headers),
        ..Default::default()
    };

    state.lettering_repo.create(&lettering).await?;

    if state.config.enable_ml_processing {
        if let Err(err) = state
            .queue
            .enqueue_ml_job(MlJob {
                lettering_id: id,
                image_url,
            })
            .await
        {
            tracing::warn!("ml queue enqueue failed for {}: {}", id, err);
            approve_without_ml(&state, id, "Street Discovery").await?;
            return Ok(Json(serde_json::json!({ "id": id, "status": "approved" })));
        }
    } else {
        approve_without_ml(&state, id, "Street Discovery").await?;
        return Ok(Json(serde_json::json!({ "id": id, "status": "approved" })));
    }

    Ok(Json(
        serde_json::json!({ "id": id, "status": "processing" }),
    ))
}
