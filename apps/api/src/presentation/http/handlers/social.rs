use crate::domain::social::repository::SocialRepository;
use crate::presentation::http::{errors::AppError, state::AppState};
use axum::{
    Json,
    extract::{Path, State},
    http::HeaderMap,
};
use uuid::Uuid;

fn extract_client_ip(headers: &HeaderMap) -> String {
    headers
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
        })
        .unwrap_or("127.0.0.1")
        .to_string()
}

pub async fn like_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, AppError> {
    let ip = extract_client_ip(&headers);
    let (liked, count) = state
        .social_repo
        .toggle_like(id, &ip)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;
    Ok(Json(
        serde_json::json!({ "liked": liked, "likes_count": count }),
    ))
}

pub async fn add_comment(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, AppError> {
    let content = body
        .get("content")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::BadRequest("Missing content".into()))?;
    let ip = extract_client_ip(&headers);
    let comment = state
        .social_repo
        .add_comment(id, content.to_string(), Some(&ip))
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;
    Ok(Json(serde_json::to_value(comment).unwrap()))
}

pub async fn get_comments(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let comments = state
        .social_repo
        .get_comments(id)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;
    Ok(Json(serde_json::to_value(comments).unwrap()))
}
