use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use chrono::{DateTime, Utc};
use jsonwebtoken::{EncodingKey, Header, encode};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{
    domain::lettering::repository::LetteringRepository,
    presentation::http::{errors::AppError, middleware::admin::AdminClaims, state::AppState},
};

// --- DTOs ---

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
}

#[derive(Debug, Deserialize)]
pub struct ModerationQuery {
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

fn default_status() -> String {
    "ALL".to_string()
}
fn default_limit() -> i64 {
    50
}

#[derive(Debug, Serialize)]
pub struct ModerationItem {
    pub id: Uuid,
    pub image_url: String,
    pub thumbnail_small: Option<String>,
    pub contributor_tag: String,
    pub pin_code: String,
    pub detected_text: Option<String>,
    pub status: String,
    pub likes_count: i32,
    pub comments_count: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ModerationQueueResponse {
    pub items: Vec<ModerationItem>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct StatsResponse {
    pub total_uploads: i64,
    pub pending_approvals: i64,
    pub approved: i64,
    pub rejected: i64,
    pub total_cities: i64,
    pub total_likes: i64,
    pub total_comments: i64,
}

#[derive(Debug, Deserialize)]
pub struct RejectRequest {
    pub reason: Option<String>,
}

// --- Handlers ---

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    // Validate email
    if body.email != state.config.admin_email {
        return Err(AppError::Forbidden("Invalid credentials".to_string()));
    }

    // Hash the provided password and compare with stored hash
    let mut hasher = Sha256::new();
    hasher.update(body.password.as_bytes());
    let password_hash = format!("{:x}", hasher.finalize());

    if password_hash != state.config.admin_password_hash {
        return Err(AppError::Forbidden("Invalid credentials".to_string()));
    }

    // Issue JWT valid for 24 hours
    let exp = (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize;
    let claims = AdminClaims {
        sub: body.email,
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::InternalError(format!("Token generation failed: {}", e)))?;

    tracing::info!("Admin login successful");
    Ok(Json(LoginResponse { token }))
}

pub async fn get_moderation_queue(
    State(state): State<AppState>,
    Query(params): Query<ModerationQuery>,
) -> Result<Json<ModerationQueueResponse>, AppError> {
    let status_filter = params.status.to_uppercase();

    let (items, total) = if status_filter == "ALL" {
        let items = sqlx::query_as!(
            ModerationItem,
            r#"SELECT id, image_url, thumbnail_small, contributor_tag, pin_code,
               detected_text, status, likes_count, comments_count, created_at
               FROM letterings
               ORDER BY created_at DESC
               LIMIT $1 OFFSET $2"#,
            params.limit,
            params.offset,
        )
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

        let total = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings")
            .fetch_one(&state.db)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?
            .unwrap_or(0);

        (items, total)
    } else {
        let items = sqlx::query_as!(
            ModerationItem,
            r#"SELECT id, image_url, thumbnail_small, contributor_tag, pin_code,
               detected_text, status, likes_count, comments_count, created_at
               FROM letterings
               WHERE status = $1
               ORDER BY created_at ASC
               LIMIT $2 OFFSET $3"#,
            status_filter,
            params.limit,
            params.offset,
        )
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

        let total = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM letterings WHERE status = $1",
            status_filter,
        )
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

        (items, total)
    };

    Ok(Json(ModerationQueueResponse { items, total }))
}

pub async fn approve_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let result = sqlx::query!(
        "UPDATE letterings SET status = 'APPROVED', updated_at = NOW() WHERE id = $1",
        id
    )
    .execute(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Lettering not found".to_string()));
    }

    tracing::info!(lettering_id = %id, "Lettering approved");
    Ok(StatusCode::OK)
}

pub async fn reject_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<RejectRequest>,
) -> Result<StatusCode, AppError> {
    let reason = body
        .reason
        .unwrap_or_else(|| "Rejected by admin".to_string());

    let result = sqlx::query!(
        "UPDATE letterings SET status = 'REJECTED', detected_text = $2, updated_at = NOW() WHERE id = $1",
        id,
        reason,
    )
    .execute(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Lettering not found".to_string()));
    }

    tracing::info!(lettering_id = %id, reason = %reason, "Lettering rejected");
    Ok(StatusCode::OK)
}

pub async fn delete_any_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let lettering = state
        .lettering_repo
        .find_by_id(id)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Lettering not found".to_string()))?;

    // Clean up R2 storage
    let url_parts: Vec<&str> = lettering.image_url.split('/').collect();
    if let Some(filename) = url_parts.last() {
        let _ = state
            .storage
            .delete(&format!("letterings/{}", filename))
            .await;
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

    state
        .lettering_repo
        .delete(id)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    tracing::info!(lettering_id = %id, "Lettering deleted by admin");
    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_stats(State(state): State<AppState>) -> Result<Json<StatsResponse>, AppError> {
    let total = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    let pending = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings WHERE status = 'PENDING'")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    let approved = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings WHERE status = 'APPROVED'")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    let rejected = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings WHERE status = 'REJECTED'")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    let cities = sqlx::query_scalar!("SELECT COUNT(*) FROM cities")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    let likes = sqlx::query_scalar!("SELECT COUNT(*) FROM likes")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    let comments = sqlx::query_scalar!("SELECT COUNT(*) FROM comments")
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .unwrap_or(0);

    Ok(Json(StatsResponse {
        total_uploads: total,
        pending_approvals: pending,
        approved,
        rejected,
        total_cities: cities,
        total_likes: likes,
        total_comments: comments,
    }))
}
