use axum::{extract::{State, Query}, Json};
use serde::{Deserialize, Serialize};
use crate::presentation::http::{state::AppState, errors::AppError};

#[derive(Serialize)]
pub struct Marker {
    pub id: uuid::Uuid,
    pub lat: f64,
    pub lng: f64,
    pub thumbnail: String,
}

#[derive(Serialize)]
pub struct CoveragePoint {
    pub pin_code: String,
    pub lat: f64,
    pub lng: f64,
    pub count: i64,
}

#[derive(Deserialize)]
pub struct NearbyQuery {
    pub lat: f64,
    pub lng: f64,
    pub radius_m: f64,
}

pub async fn get_all_markers(State(state): State<AppState>) -> Result<Json<Vec<Marker>>, AppError> {
    let rows = sqlx::query!(
        r#"SELECT id, COALESCE(thumbnail_small, '') as "thumbnail_small!", ST_Y(location::geometry) as "lat!", ST_X(location::geometry) as "lng!"
           FROM letterings WHERE status = 'APPROVED' LIMIT 1000"#
    ).fetch_all(&state.db).await.map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(Json(rows.into_iter().map(|r| Marker {
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        thumbnail: r.thumbnail_small,
    }).collect()))
}

pub async fn get_nearby_markers(State(state): State<AppState>, Query(q): Query<NearbyQuery>) -> Result<Json<Vec<Marker>>, AppError> {
    let rows = sqlx::query!(
        r#"SELECT id, COALESCE(thumbnail_small, '') as "thumbnail_small!", ST_Y(location::geometry) as "lat!", ST_X(location::geometry) as "lng!"
           FROM letterings
           WHERE status = 'APPROVED'
           AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)"#,
        q.lng, q.lat, q.radius_m
    ).fetch_all(&state.db).await.map_err(|e| AppError::InternalError(e.to_string()))?;

    Ok(Json(rows.into_iter().map(|r| Marker {
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        thumbnail: r.thumbnail_small,
    }).collect()))
}

pub async fn get_coverage(State(state): State<AppState>) -> Result<Json<Vec<CoveragePoint>>, AppError> {
    let rows: Vec<(String, f64, f64, i64)> = sqlx::query_as(
        r#"SELECT
                pin_code,
                AVG(ST_Y(location::geometry))::double precision as lat,
                AVG(ST_X(location::geometry))::double precision as lng,
                COUNT(*)::bigint as count
           FROM letterings
           WHERE status = 'APPROVED'
           GROUP BY pin_code
           ORDER BY COUNT(*) DESC"#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e: sqlx::Error| AppError::InternalError(e.to_string()))?;

    Ok(Json(
        rows.into_iter()
            .map(|(pin_code, lat, lng, count)| CoveragePoint {
                pin_code,
                lat,
                lng,
                count,
            })
            .collect(),
    ))
}
