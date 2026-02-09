use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;
use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
pub struct City {
    pub id: Uuid,
    pub name: String,
    pub country_code: String,
}

pub async fn list_cities(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<City>>, StatusCode> {
    let cities = sqlx::query_as!(
        City,
        "SELECT id, name, country_code FROM cities ORDER BY name"
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    Ok(Json(cities))
}