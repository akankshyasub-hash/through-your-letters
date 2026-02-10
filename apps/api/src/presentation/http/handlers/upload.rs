use axum::{extract::{Multipart, State}, http::StatusCode, Json};
use bytes::Bytes;
use serde::Serialize;
use tracing::Span;
use uuid::Uuid;
use crate::{application::upload_lettering::{dto::UploadLetteringRequest, use_case::UploadLetteringUseCase}, infrastructure::repositories::sqlx_lettering_repository::SqlxLetteringRepository, presentation::http::state::AppState};

#[derive(Debug, Serialize)]
pub struct UploadResponse {
    pub id: Uuid,
    pub url: String,
    pub status: String,
    pub message: String,
}

#[tracing::instrument(skip(state, multipart), fields(city_id, contributor))]
pub async fn upload_lettering(State(state): State<AppState>, mut multipart: Multipart) -> Result<Json<UploadResponse>, StatusCode> {
    let mut image_data: Option<Bytes> = None;
    let mut contributor_tag: Option<String> = None;
    let mut pin_code: Option<String> = None;
    let mut city_id: Option<Uuid> = None;
    let mut description: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        let name = field.name().unwrap_or("").to_string();
        match name.as_str() {
            "image" => image_data = Some(field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?),
            "contributor_tag" => {
                contributor_tag = Some(field.text().await.map_err(|_| StatusCode::BAD_REQUEST)?);
                Span::current().record("contributor", contributor_tag.as_ref().unwrap().as_str());
            }
            "pin_code" => pin_code = Some(field.text().await.map_err(|_| StatusCode::BAD_REQUEST)?),
            "city_id" => {
                let text = field.text().await.map_err(|_| StatusCode::BAD_REQUEST)?;
                city_id = Some(Uuid::parse_str(&text).map_err(|_| StatusCode::BAD_REQUEST)?);
                Span::current().record("city_id", &city_id.unwrap().to_string());
            }
            "description" => {
                description = Some(field.text().await.map_err(|_| StatusCode::BAD_REQUEST)?);
            }
            _ => {}
        }
    }

    let repository = SqlxLetteringRepository::new(state.db.clone());
    let use_case = UploadLetteringUseCase::new(Box::new(repository), state.storage, state.queue);
    let request = UploadLetteringRequest {
        city_id: city_id.ok_or(StatusCode::BAD_REQUEST)?,
        contributor_tag: contributor_tag.ok_or(StatusCode::BAD_REQUEST)?,
        pin_code: pin_code.ok_or(StatusCode::BAD_REQUEST)?,
        image_data: image_data.ok_or(StatusCode::BAD_REQUEST)?,
        description,
        uploaded_by_ip: None,
    };

    let lettering = use_case.execute(request).await.map_err(|e| {
        tracing::error!("Upload failed: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;
    Ok(Json(UploadResponse { 
        id: lettering.id, 
        url: lettering.image_url.clone(), 
        status: "processing".into(), 
        message: "Upload successful".into() 
    }))
}