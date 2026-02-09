use axum::{
    extract::{State, Path},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use uuid::Uuid;
use serde_json::json;
use crate::{
    domain::lettering::repository::LetteringRepository,
    presentation::http::{state::AppState, errors::AppError},
};

pub async fn delete_any_lettering(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    state.lettering_repo.delete(id).await
        .map_err(|e| AppError::InternalError(e.to_string()))?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn approve_lettering(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    sqlx::query!(
        "UPDATE letterings SET status = 'APPROVED' WHERE id = $1",
        id
    )
    .execute(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;
    
    Ok(StatusCode::OK)
}

pub async fn get_stats(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings")
        .fetch_one(&state.db)
        .await
        .unwrap_or(Some(0))
        .unwrap_or(0);
    
    let pending = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings WHERE status = 'PENDING'")
        .fetch_one(&state.db)
        .await
        .unwrap_or(Some(0))
        .unwrap_or(0);
    
    let cities = sqlx::query_scalar!("SELECT COUNT(*) FROM cities")
        .fetch_one(&state.db)
        .await
        .unwrap_or(Some(0))
        .unwrap_or(0);
    
    Json(json!({
        "total_uploads": total,
        "pending_approvals": pending,
        "total_cities": cities,
    }))
}