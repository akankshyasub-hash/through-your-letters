use crate::{
    application::get_letterings::{dto::PaginatedResponse, use_case::GetLetteringsUseCase},
    domain::lettering::repository::LetteringRepository,
    infrastructure::repositories::sqlx_lettering_repository::SqlxLetteringRepository,
    presentation::http::state::AppState,
};
use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    #[serde(default = "default_limit")]
    limit: i64,
    #[serde(default)]
    offset: i64,
    city_id: Option<Uuid>,
}

fn default_limit() -> i64 {
    50
}

pub async fn get_letterings(
    State(state): State<AppState>,
    Query(params): Query<PaginationQuery>,
) -> Result<Json<PaginatedResponse>, StatusCode> {
    let repository = SqlxLetteringRepository::new(state.db.clone());

    if let Some(city_id) = params.city_id {
        let letterings = repository
            .find_by_city(city_id, params.limit, params.offset)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        return Ok(Json(PaginatedResponse {
            total: letterings.len() as i64,
            letterings,
            limit: params.limit,
            offset: params.offset,
        }));
    }

    let use_case = GetLetteringsUseCase::new(Box::new(repository));
    let response = use_case
        .execute(params.limit, params.offset)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(response))
}
