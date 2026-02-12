use crate::{
    application::get_letterings::dto::PaginatedResponse,
    domain::lettering::entity::Lettering,
    presentation::http::{errors::AppError, state::AppState},
};
use axum::{
    Json,
    extract::{Query, State},
};
use serde::Deserialize;
use sqlx::{Postgres, QueryBuilder};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct GalleryQuery {
    #[serde(default = "default_limit")]
    limit: i64,
    #[serde(default)]
    offset: i64,
    city_id: Option<Uuid>,
    script: Option<String>,
    style: Option<String>,
    sort_by: Option<String>,
}

fn default_limit() -> i64 {
    50
}

fn apply_gallery_filters(qb: &mut QueryBuilder<'_, Postgres>, params: &GalleryQuery) {
    qb.push(
        " WHERE l.status = 'APPROVED'
          AND COALESCE(rp.discoverability_enabled, true)",
    );

    if let Some(city_id) = params.city_id {
        qb.push(" AND l.city_id = ").push_bind(city_id);
    }

    if let Some(script) = params.script.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        qb.push(" AND l.ml_script = ").push_bind(script.to_string());
    }

    if let Some(style) = params.style.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        qb.push(" AND l.ml_style = ").push_bind(style.to_string());
    }
}

pub async fn get_letterings(
    State(state): State<AppState>,
    Query(params): Query<GalleryQuery>,
) -> Result<Json<PaginatedResponse>, AppError> {
    let safe_limit = params.limit.clamp(1, 100);
    let safe_offset = params.offset.max(0);

    let mut count_qb = QueryBuilder::<Postgres>::new(
        "SELECT COUNT(*)::bigint
         FROM letterings l
         JOIN cities c ON c.id = l.city_id
         LEFT JOIN region_policies rp ON rp.country_code = c.country_code",
    );
    apply_gallery_filters(&mut count_qb, &params);
    let total: i64 = count_qb
        .build_query_scalar()
        .fetch_one(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let mut data_qb = QueryBuilder::<Postgres>::new(
        "SELECT l.id, l.city_id, l.contributor_tag, l.image_url,
                l.thumbnail_small, l.thumbnail_medium, l.thumbnail_large,
                l.pin_code, l.status, l.created_at, l.updated_at,
                l.detected_text, l.description, l.image_hash,
                l.ml_style, l.ml_script, l.ml_confidence, l.ml_color_palette,
                l.cultural_context, l.report_count, l.report_reasons,
                l.likes_count, l.comments_count, l.uploaded_by_ip,
                ST_AsText(l.location) AS location
         FROM letterings l
         JOIN cities c ON c.id = l.city_id
         LEFT JOIN region_policies rp ON rp.country_code = c.country_code",
    );
    apply_gallery_filters(&mut data_qb, &params);

    let order_by = match params.sort_by.as_deref() {
        Some("oldest") => " ORDER BY l.created_at ASC",
        Some("popular") => " ORDER BY l.likes_count DESC, l.created_at DESC",
        _ => " ORDER BY l.created_at DESC",
    };
    data_qb
        .push(order_by)
        .push(" LIMIT ")
        .push_bind(safe_limit)
        .push(" OFFSET ")
        .push_bind(safe_offset);

    let rows: Vec<LetteringRow> = data_qb
        .build_query_as()
        .fetch_all(&state.db)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;

    let letterings: Vec<Lettering> = rows.into_iter().map(Into::into).collect();

    Ok(Json(PaginatedResponse {
        total,
        letterings,
        limit: safe_limit,
        offset: safe_offset,
    }))
}

#[derive(sqlx::FromRow)]
struct LetteringRow {
    id: Uuid,
    city_id: Uuid,
    contributor_tag: String,
    image_url: String,
    thumbnail_small: String,
    thumbnail_medium: String,
    thumbnail_large: String,
    pin_code: String,
    status: String,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
    detected_text: Option<String>,
    description: Option<String>,
    image_hash: Option<String>,
    ml_style: Option<String>,
    ml_script: Option<String>,
    ml_confidence: Option<f32>,
    ml_color_palette: Option<serde_json::Value>,
    cultural_context: Option<String>,
    report_count: i32,
    report_reasons: serde_json::Value,
    likes_count: i32,
    comments_count: i32,
    uploaded_by_ip: Option<sqlx::types::ipnetwork::IpNetwork>,
    location: Option<String>,
}

impl From<LetteringRow> for Lettering {
    fn from(r: LetteringRow) -> Self {
        use crate::domain::lettering::entity::*;

        let coords = r
            .location
            .as_deref()
            .and_then(|wkt| {
                let wkt = wkt.trim();
                let inner = wkt.strip_prefix("POINT(")?.strip_suffix(')')?;
                let mut parts = inner.split_whitespace();
                let lng: f64 = parts.next()?.parse().ok()?;
                let lat: f64 = parts.next()?.parse().ok()?;
                Some(vec![lng, lat])
            })
            .unwrap_or_else(|| vec![77.5946, 12.9716]);

        let status = match r.status.as_str() {
            "APPROVED" => LetteringStatus::Approved,
            "REJECTED" => LetteringStatus::Rejected,
            "REPORTED" => LetteringStatus::Reported,
            _ => LetteringStatus::Pending,
        };

        Lettering {
            id: r.id,
            city_id: r.city_id,
            contributor_tag: r.contributor_tag,
            image_url: r.image_url,
            thumbnail_urls: ThumbnailUrls {
                small: r.thumbnail_small,
                medium: r.thumbnail_medium,
                large: r.thumbnail_large,
            },
            location: Coordinates {
                r#type: "Point".into(),
                coordinates: coords,
            },
            pin_code: r.pin_code,
            detected_text: r.detected_text,
            ml_metadata: Some(ImageMetadata {
                style: r.ml_style,
                script: r.ml_script,
                confidence: r.ml_confidence,
                color_palette: r
                    .ml_color_palette
                    .and_then(|v| serde_json::from_value(v).ok()),
            }),
            description: r.description,
            is_lettering: true,
            status,
            likes_count: r.likes_count,
            comments_count: r.comments_count,
            uploaded_by_ip: r.uploaded_by_ip,
            image_hash: r.image_hash,
            report_count: r.report_count,
            report_reasons: serde_json::from_value(r.report_reasons).unwrap_or_default(),
            cultural_context: r.cultural_context,
            created_at: r.created_at,
            updated_at: r.updated_at,
        }
    }
}
