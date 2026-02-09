use axum::{extract::{Query, State}, http::StatusCode, Json};
use serde::Deserialize;
use crate::{application::get_letterings::{dto::PaginatedResponse, use_case::GetLetteringsUseCase}, infrastructure::repositories::sqlx_lettering_repository::SqlxLetteringRepository, presentation::http::state::AppState};

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    #[serde(default = "default_limit")]
    limit: i64,
    #[serde(default)]
    offset: i64,
}

fn default_limit() -> i64 { 50 }

pub async fn get_letterings(State(state): State<AppState>, Query(params): Query<PaginationQuery>) -> Result<Json<PaginatedResponse>, StatusCode> {
    let repository = SqlxLetteringRepository::new(state.db.clone());
    let use_case = GetLetteringsUseCase::new(Box::new(repository));
    let response = use_case.execute(params.limit, params.offset).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(response))
}
