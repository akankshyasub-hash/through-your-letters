use axum::{
    Json,
    extract::{Path, State},
};
use serde::Serialize;
use uuid::Uuid;

use crate::presentation::http::{errors::AppError, state::AppState};

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct City {
    pub id: Uuid,
    pub name: String,
    pub country_code: String,
    pub center_lat: Option<f64>,
    pub center_lng: Option<f64>,
    pub default_zoom: Option<i32>,
    pub description: Option<String>,
    pub is_active: Option<bool>,
}

pub async fn list_cities(State(state): State<AppState>) -> Result<Json<Vec<City>>, AppError> {
    let cities: Vec<City> = sqlx::query_as(
        "SELECT id, name, country_code, center_lat, center_lng, default_zoom, description, is_active FROM cities ORDER BY is_active DESC, name"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e: sqlx::Error| AppError::InternalError(e.to_string()))?;

    Ok(Json(cities))
}

pub async fn get_city(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let city: City = sqlx::query_as(
        "SELECT id, name, country_code, center_lat, center_lng, default_zoom, description, is_active FROM cities WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e: sqlx::Error| AppError::InternalError(e.to_string()))?
    .ok_or_else(|| AppError::NotFound("City not found".into()))?;

    let count: (Option<i64>,) = sqlx::query_as(
        "SELECT COUNT(*) FROM letterings WHERE city_id = $1 AND status = 'APPROVED'",
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e: sqlx::Error| AppError::InternalError(e.to_string()))?;

    Ok(Json(serde_json::json!({
        "id": city.id,
        "name": city.name,
        "country_code": city.country_code,
        "center_lat": city.center_lat,
        "center_lng": city.center_lng,
        "default_zoom": city.default_zoom,
        "description": city.description,
        "is_active": city.is_active,
        "lettering_count": count.0.unwrap_or(0),
    })))
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct CityNeighborhoodStat {
    pub pin_code: String,
    pub count: i64,
}

pub async fn get_city_stats(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<CityNeighborhoodStat>>, AppError> {
    let stats: Vec<CityNeighborhoodStat> = sqlx::query_as(
        r#"SELECT pin_code, COUNT(*)::bigint AS count
           FROM letterings
           WHERE city_id = $1 AND status = 'APPROVED'
           GROUP BY pin_code
           ORDER BY count DESC"#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|e: sqlx::Error| AppError::InternalError(e.to_string()))?;

    Ok(Json(stats))
}
