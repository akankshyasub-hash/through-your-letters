use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use uuid::Uuid;

use crate::{
    domain::lettering::repository::LetteringRepository,
    presentation::http::{errors::AppError, state::AppState},
};

pub async fn delete_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let lettering = state
        .lettering_repo
        .find_by_id(id)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Lettering not found".to_string()))?;

    // Delete from Cloudflare R2
    let url_parts: Vec<&str> = lettering.image_url.split('/').collect();
    if let Some(filename) = url_parts.last() {
        let key = format!("letterings/{}", filename);
        if let Err(e) = state.storage.delete(&key).await {
            tracing::error!("Failed to delete R2 object {}: {}", key, e);
        }
        let _ = state
            .storage
            .delete(&format!("thumbnails/small/{}", filename))
            .await;
        let _ = state
            .storage
            .delete(&format!("thumbnails/medium/{}", filename))
            .await;
        let _ = state
            .storage
            .delete(&format!("thumbnails/large/{}", filename))
            .await;
    }

    // Delete from database (cascades to likes, comments)
    state
        .lettering_repo
        .delete(id)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    tracing::info!(lettering_id = %id, "Lettering deleted successfully");

    Ok(StatusCode::NO_CONTENT)
}
