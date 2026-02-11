use crate::domain::lettering::{entity::*, errors::DomainError, repository::LetteringRepository};
use async_trait::async_trait;
use sqlx::{PgPool, FromRow, types::ipnetwork::IpNetwork};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(FromRow)]
struct LetteringRow {
    id: Uuid,
    city_id: Uuid,
    contributor_tag: String,
    image_url: String,
    thumbnail_small: String,
    thumbnail_medium: String,
    thumbnail_large: String,
    location_wkt: String,
    pin_code: String,
    status: String,
    uploaded_by_ip: Option<IpNetwork>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    likes_count: i32,
    comments_count: i32,
    detected_text: Option<String>,
    description: Option<String>,
    image_hash: Option<String>,
    report_count: i32,
    report_reasons: serde_json::Value,
    cultural_context: Option<String>,
    ml_style: Option<String>,
    ml_script: Option<String>,
    ml_confidence: Option<f32>,
    ml_color_palette: Option<serde_json::Value>,
}

impl From<LetteringRow> for Lettering {
    fn from(r: LetteringRow) -> Self {
        let coords = r.location_wkt.strip_prefix("POINT(").and_then(|s| s.strip_suffix(")"))
            .and_then(|s| s.split_once(' '))
            .and_then(|(lng, lat)| Some(vec![lng.parse().ok()?, lat.parse().ok()?]))
            .unwrap_or_else(|| vec![0.0, 0.0]);

        Lettering {
            id: r.id, city_id: r.city_id, contributor_tag: r.contributor_tag, image_url: r.image_url,
            thumbnail_urls: ThumbnailUrls { small: r.thumbnail_small, medium: r.thumbnail_medium, large: r.thumbnail_large },
            location: Coordinates { r#type: "Point".into(), coordinates: coords },
            pin_code: r.pin_code, detected_text: r.detected_text,
            ml_metadata: Some(ImageMetadata {
                style: r.ml_style, script: r.ml_script, confidence: r.ml_confidence,
                color_palette: r.ml_color_palette.and_then(|v| serde_json::from_value(v).ok()),
            }),
            description: r.description, is_lettering: true,
            status: match r.status.as_str() {
                "APPROVED" => LetteringStatus::Approved,
                "REJECTED" => LetteringStatus::Rejected,
                "REPORTED" => LetteringStatus::Reported,
                _ => LetteringStatus::Pending,
            },
            likes_count: r.likes_count, comments_count: r.comments_count,
            uploaded_by_ip: r.uploaded_by_ip, image_hash: r.image_hash,
            report_count: r.report_count, report_reasons: serde_json::from_value(r.report_reasons).unwrap_or_default(),
            cultural_context: r.cultural_context, created_at: r.created_at, updated_at: r.updated_at,
        }
    }
}

pub struct SqlxLetteringRepository { pub pool: PgPool }
impl SqlxLetteringRepository { pub fn new(pool: PgPool) -> Self { Self { pool } } }

#[async_trait]
impl LetteringRepository for SqlxLetteringRepository {
    async fn create(&self, l: &Lettering) -> Result<Lettering, DomainError> {
        let pt = format!("POINT({} {})", l.location.coordinates[0], l.location.coordinates[1]);
        sqlx::query!(
            r#"INSERT INTO letterings (id, city_id, contributor_tag, image_url, thumbnail_small, thumbnail_medium, thumbnail_large, location, pin_code, status, uploaded_by_ip, image_hash, description)
               VALUES ($1, $2, $3, $4, $5, $6, $7, ST_GeogFromText($8), $9, $10, $11, $12, $13)"#,
            l.id, l.city_id, l.contributor_tag, l.image_url, l.thumbnail_urls.small, l.thumbnail_urls.medium, l.thumbnail_urls.large, pt, l.pin_code, "PENDING", l.uploaded_by_ip as _, l.image_hash, l.description
        ).execute(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(l.clone())
    }

    async fn find_all(&self, limit: i64, offset: i64) -> Result<Vec<Lettering>, DomainError> {
        let rows = sqlx::query_as!(LetteringRow,
            r#"SELECT id, city_id, contributor_tag, image_url, thumbnail_small, thumbnail_medium, thumbnail_large, pin_code, status, created_at, updated_at, likes_count, comments_count, detected_text, description, image_hash, report_count, report_reasons, cultural_context, ml_style, ml_script, ml_confidence, ml_color_palette, ST_AsText(location) as "location_wkt!", uploaded_by_ip as "uploaded_by_ip: _" FROM letterings WHERE status = 'APPROVED' ORDER BY created_at DESC LIMIT $1 OFFSET $2"#,
            limit, offset
        ).fetch_all(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(rows.into_iter().map(Lettering::from).collect())
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Lettering>, DomainError> {
        let row = sqlx::query_as!(LetteringRow,
            r#"SELECT id, city_id, contributor_tag, image_url, thumbnail_small, thumbnail_medium, thumbnail_large, pin_code, status, created_at, updated_at, likes_count, comments_count, detected_text, description, image_hash, report_count, report_reasons, cultural_context, ml_style, ml_script, ml_confidence, ml_color_palette, ST_AsText(location) as "location_wkt!", uploaded_by_ip as "uploaded_by_ip: _" FROM letterings WHERE id = $1"#, id
        ).fetch_optional(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(row.map(Lettering::from))
    }

    async fn find_by_image_hash(&self, hash: &str) -> Result<Option<Lettering>, DomainError> {
        let row = sqlx::query_as!(LetteringRow,
            r#"SELECT id, city_id, contributor_tag, image_url, thumbnail_small, thumbnail_medium, thumbnail_large, pin_code, status, created_at, updated_at, likes_count, comments_count, detected_text, description, image_hash, report_count, report_reasons, cultural_context, ml_style, ml_script, ml_confidence, ml_color_palette, ST_AsText(location) as "location_wkt!", uploaded_by_ip as "uploaded_by_ip: _" FROM letterings WHERE image_hash = $1"#, hash
        ).fetch_optional(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(row.map(Lettering::from))
    }

    async fn search(&self, q: &str) -> Result<Vec<Lettering>, DomainError> {
        let rows = sqlx::query_as!(LetteringRow,
            r#"SELECT id, city_id, contributor_tag, image_url, thumbnail_small, thumbnail_medium, thumbnail_large, pin_code, status, created_at, updated_at, likes_count, comments_count, detected_text, description, image_hash, report_count, report_reasons, cultural_context, ml_style, ml_script, ml_confidence, ml_color_palette, ST_AsText(location) as "location_wkt!", uploaded_by_ip as "uploaded_by_ip: _" FROM letterings
               WHERE (detected_text_tsv @@ websearch_to_tsquery('english', $1) OR contributor_tag ILIKE $2) AND status = 'APPROVED' LIMIT 50"#,
            q, format!("%{}%", q)
        ).fetch_all(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(rows.into_iter().map(Lettering::from).collect())
    }

    async fn count_by_contributor_today(&self, tag: &str) -> Result<i64, DomainError> {
        let count = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings WHERE contributor_tag = $1 AND created_at > CURRENT_DATE", tag)
            .fetch_one(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(count.unwrap_or(0))
    }

    async fn find_by_contributor(&self, tag: &str, limit: i64, offset: i64) -> Result<Vec<Lettering>, DomainError> {
        let rows = sqlx::query_as!(LetteringRow,
            r#"SELECT id, city_id, contributor_tag, image_url, thumbnail_small, thumbnail_medium, thumbnail_large, pin_code, status, created_at, updated_at, likes_count, comments_count, detected_text, description, image_hash, report_count, report_reasons, cultural_context, ml_style, ml_script, ml_confidence, ml_color_palette, ST_AsText(location) as "location_wkt!", uploaded_by_ip as "uploaded_by_ip: _" FROM letterings WHERE contributor_tag = $1 AND status = 'APPROVED' ORDER BY created_at DESC LIMIT $2 OFFSET $3"#,
            tag, limit, offset
        ).fetch_all(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(rows.into_iter().map(Lettering::from).collect())
    }

    async fn count_by_contributor(&self, tag: &str) -> Result<i64, DomainError> {
        let count = sqlx::query_scalar!("SELECT COUNT(*) FROM letterings WHERE contributor_tag = $1 AND status = 'APPROVED'", tag)
            .fetch_one(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(count.unwrap_or(0))
    }

    async fn find_by_city(&self, city_id: Uuid, limit: i64, offset: i64) -> Result<Vec<Lettering>, DomainError> {
        let rows = sqlx::query_as!(LetteringRow,
            r#"SELECT id, city_id, contributor_tag, image_url, thumbnail_small, thumbnail_medium, thumbnail_large, pin_code, status, created_at, updated_at, likes_count, comments_count, detected_text, description, image_hash, report_count, report_reasons, cultural_context, ml_style, ml_script, ml_confidence, ml_color_palette, ST_AsText(location) as "location_wkt!", uploaded_by_ip as "uploaded_by_ip: _" FROM letterings WHERE city_id = $1 AND status = 'APPROVED' ORDER BY created_at DESC LIMIT $2 OFFSET $3"#,
            city_id, limit, offset
        ).fetch_all(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(rows.into_iter().map(Lettering::from).collect())
    }

    async fn update(&self, _l: &Lettering) -> Result<Lettering, DomainError> { Err(DomainError::InfrastructureError("Unimplemented".into())) }
    async fn delete(&self, id: Uuid) -> Result<(), DomainError> {
        sqlx::query!("DELETE FROM letterings WHERE id = $1", id).execute(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(())
    }
}
