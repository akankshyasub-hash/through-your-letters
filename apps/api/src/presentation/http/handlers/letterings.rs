use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    domain::lettering::repository::LetteringRepository,
    presentation::http::{errors::AppError, state::AppState},
};

#[derive(Debug, Deserialize)]
pub struct ReportRequest {
    pub reason: String,
}

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

/// Report an artifact. Increments report_count and appends the reason.
/// Items crossing the threshold (3 reports) are automatically hidden (REPORTED status).
pub async fn report_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<ReportRequest>,
) -> Result<StatusCode, AppError> {
    let reason = body.reason.trim().to_string();
    if reason.is_empty() {
        return Err(AppError::BadRequest(
            "Report reason is required".to_string(),
        ));
    }

    let result = sqlx::query!(
        r#"UPDATE letterings
        SET report_count = report_count + 1,
            report_reasons = report_reasons || $2::jsonb,
            status = CASE WHEN report_count + 1 >= 3 THEN 'REPORTED' ELSE status END,
            updated_at = NOW()
        WHERE id = $1"#,
        id,
        serde_json::json!([reason]),
    )
    .execute(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Lettering not found".to_string()));
    }

    tracing::info!(lettering_id = %id, "Lettering reported");
    Ok(StatusCode::OK)
}
