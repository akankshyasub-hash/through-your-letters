use axum::{Json, extract::State};
use serde::Serialize;
use uuid::Uuid;

use crate::presentation::http::{errors::AppError, state::AppState};

#[derive(Debug, Serialize)]
pub struct City {
    pub id: Uuid,
    pub name: String,
    pub country_code: String,
}

pub async fn list_cities(State(state): State<AppState>) -> Result<Json<Vec<City>>, AppError> {
    let cities = sqlx::query_as!(
        City,
        "SELECT id, name, country_code FROM cities ORDER BY name"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(Json(cities))
}
