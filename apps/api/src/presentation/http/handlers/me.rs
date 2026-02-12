use axum::{
    Json,
    extract::{Path, Query, State},
    http::HeaderMap,
    http::StatusCode,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::presentation::http::{
    errors::AppError, middleware::user::decode_required_user_claims, state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct MyUploadsQuery {
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
    pub status: Option<String>,
}

fn default_limit() -> i64 {
    20
}

#[derive(Debug, Serialize, FromRow)]
pub struct MyUploadItem {
    pub id: Uuid,
    pub image_url: String,
    pub thumbnail_small: String,
    pub pin_code: String,
    pub contributor_tag: String,
    pub detected_text: Option<String>,
    pub description: Option<String>,
    pub status: String,
    pub likes_count: i32,
    pub comments_count: i32,
    pub report_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct MyUploadsResponse {
    pub items: Vec<MyUploadItem>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMyUploadRequest {
    pub description: Option<String>,
    pub contributor_tag: Option<String>,
    pub pin_code: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct NotificationItem {
    pub id: Uuid,
    pub r#type: String,
    pub title: String,
    pub body: Option<String>,
    pub metadata: serde_json::Value,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct NotificationsQuery {
    #[serde(default = "default_limit")]
    pub limit: i64,
    #[serde(default)]
    pub offset: i64,
}

#[derive(Debug, Serialize)]
pub struct NotificationsResponse {
    pub items: Vec<NotificationItem>,
    pub total: i64,
    pub unread: i64,
    pub limit: i64,
    pub offset: i64,
}

fn parse_user_id(headers: &HeaderMap, state: &AppState) -> Result<Uuid, AppError> {
    let claims = decode_required_user_claims(headers, &state.config.jwt_secret)?;
    Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Forbidden("Invalid token subject".to_string()))
}

pub async fn list_my_letterings(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<MyUploadsQuery>,
) -> Result<Json<MyUploadsResponse>, AppError> {
    let user_id = parse_user_id(&headers, &state)?;
    let status = params.status.as_ref().map(|s| s.to_uppercase());

    let (items, total) = if let Some(ref status_filter) = status {
        let allowed = ["PENDING", "APPROVED", "REJECTED", "REPORTED"];
        if !allowed.contains(&status_filter.as_str()) {
            return Err(AppError::BadRequest("Invalid status filter".to_string()));
        }

        let items = sqlx::query_as::<_, MyUploadItem>(
            "SELECT id, image_url, thumbnail_small, pin_code, contributor_tag, detected_text, description, status, likes_count, comments_count, report_count, created_at, updated_at\
             FROM letterings WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4",
        )
        .bind(user_id)
        .bind(status_filter)
        .bind(params.limit)
        .bind(params.offset)
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM letterings WHERE user_id = $1 AND status = $2",
        )
        .bind(user_id)
        .bind(status_filter)
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

        (items, total)
    } else {
        let items = sqlx::query_as::<_, MyUploadItem>(
            "SELECT id, image_url, thumbnail_small, pin_code, contributor_tag, detected_text, description, status, likes_count, comments_count, report_count, created_at, updated_at\
             FROM letterings WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        )
        .bind(user_id)
        .bind(params.limit)
        .bind(params.offset)
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

        let total =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM letterings WHERE user_id = $1")
                .bind(user_id)
                .fetch_one(&state.db)
                .await
                .map_err(|e| AppError::InternalError(e.to_string()))?;

        (items, total)
    };

    Ok(Json(MyUploadsResponse {
        items,
        total,
        limit: params.limit,
        offset: params.offset,
    }))
}

pub async fn update_my_lettering(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateMyUploadRequest>,
) -> Result<Json<MyUploadItem>, AppError> {
    let user_id = parse_user_id(&headers, &state)?;

    if body.description.is_none() && body.contributor_tag.is_none() && body.pin_code.is_none() {
        return Err(AppError::BadRequest("No updates provided".to_string()));
    }

    if let Some(pin) = body.pin_code.as_deref() {
        if pin.len() != 6 || !pin.chars().all(|c| c.is_ascii_digit()) {
            return Err(AppError::BadRequest(
                "pin_code must be 6 digits".to_string(),
            ));
        }
    }

    let contributor_tag = body
        .contributor_tag
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    let updated = sqlx::query_as::<_, MyUploadItem>(
        "UPDATE letterings\
         SET description = COALESCE($1, description),\
             contributor_tag = COALESCE($2, contributor_tag),\
             pin_code = COALESCE($3, pin_code),\
             updated_at = NOW()\
         WHERE id = $4 AND user_id = $5\
         RETURNING id, image_url, thumbnail_small, pin_code, contributor_tag, detected_text, description, status, likes_count, comments_count, report_count, created_at, updated_at",
    )
    .bind(body.description)
    .bind(contributor_tag)
    .bind(body.pin_code)
    .bind(id)
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?
    .ok_or_else(|| AppError::Forbidden("You can only update your own uploads".to_string()))?;

    Ok(Json(updated))
}

pub async fn list_notifications(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(params): Query<NotificationsQuery>,
) -> Result<Json<NotificationsResponse>, AppError> {
    let user_id = parse_user_id(&headers, &state)?;

    let items = sqlx::query_as::<_, NotificationItem>(
        "SELECT id, type, title, body, metadata, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
    )
    .bind(user_id)
    .bind(params.limit)
    .bind(params.offset)
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    let total =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM notifications WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&state.db)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;

    let unread = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false",
    )
    .bind(user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(Json(NotificationsResponse {
        items,
        total,
        unread,
        limit: params.limit,
        offset: params.offset,
    }))
}

pub async fn mark_notification_read(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    let user_id = parse_user_id(&headers, &state)?;

    let result =
        sqlx::query("UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(user_id)
            .execute(&state.db)
            .await
            .map_err(|e| AppError::InternalError(e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Notification not found".to_string()));
    }

    Ok(StatusCode::OK)
}
