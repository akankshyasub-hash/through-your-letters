use axum::{
    extract::{Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;

use crate::{
    application::search_letterings::{dto::SearchRequest, use_case::SearchLetteringsUseCase},
    domain::lettering::entity::Lettering,
    infrastructure::repositories::sqlx_lettering_repository::SqlxLetteringRepository,
    presentation::http::state::AppState,
};

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    q: String,
    #[serde(default = "default_limit")]
    limit: i64,
}

fn default_limit() -> i64 { 20 }

pub async fn search_letterings(
    State(state): State<AppState>,
    Query(params): Query<SearchQuery>,
) -> Result<Json<Vec<Lettering>>, StatusCode> {
    let repository = SqlxLetteringRepository::new(state.db.clone());
    let use_case = SearchLetteringsUseCase::new(Box::new(repository));
    
    let request = SearchRequest {
        query: params.q,
        limit: Some(params.limit),
    };
    
    let results = use_case.execute(request)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(results))
}
