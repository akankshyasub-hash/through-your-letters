use axum::{Router, routing::{get, post}};
use super::{handlers::{upload, gallery, search, social}, state::AppState};

pub fn create_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/letterings", get(gallery::get_letterings))
        .route("/api/v1/letterings/upload", post(upload::upload_lettering))
        .route("/api/v1/letterings/search", get(search::search_letterings))
        .route("/api/v1/letterings/:id/like", post(social::like_lettering))
        .route("/api/v1/letterings/:id/comments", post(social::add_comment))
        .route("/api/v1/letterings/:id/comments", get(social::get_comments))
}

async fn health_check() -> &'static str {
    "OK"
}
