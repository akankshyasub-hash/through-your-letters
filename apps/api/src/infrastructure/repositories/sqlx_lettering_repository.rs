use crate::domain::lettering::{entity::*, errors::DomainError, repository::LetteringRepository};
use async_trait::async_trait;
use sqlx::PgPool;
use uuid::Uuid;

pub struct SqlxLetteringRepository {
    pool: PgPool,
}

impl SqlxLetteringRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
    fn map_row_to_lettering(
        &self, id: Uuid, city_id: Uuid, contributor_tag: String, image_url: String,
        t_small: Option<String>, t_medium: Option<String>, t_large: Option<String>,
        location_wkt: Option<String>, pin_code: String, status: String,
        uploaded_by_ip: Option<sqlx::types::ipnetwork::IpNetwork>,
        created_at: chrono::DateTime<chrono::Utc>, updated_at: chrono::DateTime<chrono::Utc>,
        likes: i32, comments: i32, detected_text: Option<String>
    ) -> Lettering {
        let coords = location_wkt
            .and_then(|wkt| {
                wkt.strip_prefix("POINT(")?
                    .strip_suffix(")")?
                    .split_once(' ')
                    .and_then(|(lng, lat)| Some(vec![lng.parse().ok()?, lat.parse().ok()?]))
            })
            .unwrap_or_else(|| vec![0.0, 0.0]);

        Lettering {
            id, city_id, contributor_tag, image_url,
            thumbnail_urls: ThumbnailUrls {
                small: t_small.unwrap_or_default(),
                medium: t_medium.unwrap_or_default(),
                large: t_large.unwrap_or_default(),
            },
            location: Coordinates { r#type: "Point".to_string(), coordinates: coords },
            pin_code,
            detected_text,
            ml_metadata: None,
            is_lettering: true,
            status: match status.as_str() {
                "APPROVED" => LetteringStatus::Approved,
                "REJECTED" => LetteringStatus::Rejected,
                _ => LetteringStatus::Pending,
            },
            likes_count: likes,
            comments_count: comments,
            uploaded_by_ip,
            created_at,
            updated_at,
        }
    }
}

#[async_trait]
impl LetteringRepository for SqlxLetteringRepository {
    async fn create(&self, lettering: &Lettering) -> Result<Lettering, DomainError> {
        let point_wkt = format!("POINT({} {})", 
            lettering.location.coordinates[0], 
            lettering.location.coordinates[1]);
        
        sqlx::query!(
            r#"INSERT INTO letterings 
            (id, city_id, contributor_tag, image_url, thumbnail_small, thumbnail_medium, thumbnail_large, 
             location, pin_code, status, uploaded_by_ip, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, ST_GeogFromText($8), $9, $10, $11, $12, $13)"#,
            lettering.id,
            lettering.city_id,
            lettering.contributor_tag,
            lettering.image_url,
            lettering.thumbnail_urls.small,
            lettering.thumbnail_urls.medium,
            lettering.thumbnail_urls.large,
            point_wkt,
            lettering.pin_code,
            format!("{:?}", lettering.status).to_uppercase(),
            lettering.uploaded_by_ip,
            lettering.created_at,
            lettering.updated_at,
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        
        Ok(lettering.clone())
    }

    async fn find_all(&self, limit: i64, offset: i64) -> Result<Vec<Lettering>, DomainError> {
        let rows = sqlx::query!(
            r#"SELECT id, city_id, contributor_tag, image_url, 
            thumbnail_small, thumbnail_medium, thumbnail_large,
            ST_AsText(location) as location_wkt,
            pin_code, status, uploaded_by_ip, created_at, updated_at,
            likes_count, comments_count, detected_text
            FROM letterings 
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2"#,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;

        let mut results = Vec::new();
        for row in rows {
            results.push(self.map_row_to_lettering(
                row.id, row.city_id, row.contributor_tag, row.image_url,
                row.thumbnail_small, row.thumbnail_medium, row.thumbnail_large,
                row.location_wkt, row.pin_code, row.status, row.uploaded_by_ip,
                row.created_at, row.updated_at, row.likes_count, row.comments_count,
                row.detected_text
            ));
        }
        
        Ok(results)
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Lettering>, DomainError> {
        let row = sqlx::query!(
            r#"SELECT id, city_id, contributor_tag, image_url, 
            thumbnail_small, thumbnail_medium, thumbnail_large,
            ST_AsText(location) as location_wkt,
            pin_code, status, uploaded_by_ip, created_at, updated_at,
            likes_count, comments_count, detected_text
            FROM letterings WHERE id = $1"#,
            id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        
        Ok(row.map(|r| self.map_row_to_lettering(
            r.id, r.city_id, r.contributor_tag, r.image_url,
            r.thumbnail_small, r.thumbnail_medium, r.thumbnail_large,
            r.location_wkt, r.pin_code, r.status, r.uploaded_by_ip,
            r.created_at, r.updated_at, r.likes_count, r.comments_count,
            r.detected_text
        )))
    }

    async fn update(&self, _lettering: &Lettering) -> Result<Lettering, DomainError> {
        unimplemented!("Update not yet implemented")
    }

    async fn delete(&self, id: Uuid) -> Result<(), DomainError> {
        let result = sqlx::query!(
            "DELETE FROM letterings WHERE id = $1",
            id
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        
        if result.rows_affected() == 0 {
            return Err(DomainError::NotFound("Lettering not found".to_string()));
        }
        
        Ok(())
    }

    async fn search(&self, _query: &str) -> Result<Vec<Lettering>, DomainError> {
        // TODO: Implement full-text search when needed
        Ok(vec![])
    }

    async fn count_by_contributor_today(&self, contributor_tag: &str) -> Result<i64, DomainError> {
        let count = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM letterings WHERE contributor_tag = $1 AND created_at > CURRENT_DATE",
            contributor_tag
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        
        Ok(count.unwrap_or(0))
    }
}