use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    application::social::use_case::SocialUseCase,
    domain::social::comment::Comment,
    infrastructure::repositories::sqlx_social_repository::SqlxSocialRepository,
    presentation::http::state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct AddCommentRequest {
    pub content: String,
}

#[derive(Debug, Serialize)]
pub struct LikeResponse {
    pub likes_count: i32,
}

pub async fn like_lettering(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<LikeResponse>, StatusCode> {
    let repository = SqlxSocialRepository::new(state.db.clone());
    let use_case = SocialUseCase::new(Box::new(repository));
    
    // In production, get real IP from request
    let user_ip = "127.0.0.1";
    
    use_case.add_like(id, user_ip)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Return updated count (would query from DB in production)
    Ok(Json(LikeResponse { likes_count: 1 }))
}

pub async fn add_comment(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<AddCommentRequest>,
) -> Result<Json<Comment>, StatusCode> {
    let repository = SqlxSocialRepository::new(state.db.clone());
    let use_case = SocialUseCase::new(Box::new(repository));
    
    let request = crate::application::social::dto::AddCommentRequest {
        lettering_id: id,
        content: payload.content,
    };
    
    let comment = use_case.add_comment(request, Some("127.0.0.1"))
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(comment))
}

pub async fn get_comments(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<Comment>>, StatusCode> {
    let repository = SqlxSocialRepository::new(state.db.clone());
    let use_case = SocialUseCase::new(Box::new(repository));
    
    let comments = use_case.get_comments(id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(comments))
}
