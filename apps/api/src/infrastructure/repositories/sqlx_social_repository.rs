use crate::domain::{lettering::errors::DomainError, social::{comment::Comment, repository::SocialRepository}};
use async_trait::async_trait;
use sqlx::{PgPool, types::ipnetwork::IpNetwork};
use std::str::FromStr;
use uuid::Uuid;

pub struct SqlxSocialRepository { pub pool: PgPool }
impl SqlxSocialRepository { pub fn new(pool: PgPool) -> Self { Self { pool } } }

#[async_trait]
impl SocialRepository for SqlxSocialRepository {
    async fn toggle_like(&self, lettering_id: Uuid, user_ip: &str) -> Result<(bool, i32), DomainError> {
        let ip = IpNetwork::from_str(user_ip).map_err(|e| DomainError::ValidationError(e.to_string()))?;
        let mut tx = self.pool.begin().await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        
        let exists = sqlx::query_scalar!(r#"SELECT EXISTS(SELECT 1 FROM likes WHERE lettering_id = $1 AND user_ip = $2) as "exists!""#, lettering_id, ip)
            .fetch_one(&mut *tx).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;

        if exists {
            sqlx::query!("DELETE FROM likes WHERE lettering_id = $1 AND user_ip = $2", lettering_id, ip).execute(&mut *tx).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
            sqlx::query!("UPDATE letterings SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1", lettering_id).execute(&mut *tx).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        } else {
            sqlx::query!("INSERT INTO likes (id, lettering_id, user_ip) VALUES ($1, $2, $3)", Uuid::now_v7(), lettering_id, ip).execute(&mut *tx).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
            sqlx::query!("UPDATE letterings SET likes_count = likes_count + 1 WHERE id = $1", lettering_id).execute(&mut *tx).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        }

        let new_count = sqlx::query_scalar!("SELECT likes_count FROM letterings WHERE id = $1", lettering_id).fetch_one(&mut *tx).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        tx.commit().await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok((!exists, new_count))
    }

    async fn add_comment(&self, lettering_id: Uuid, content: String, user_ip: Option<&str>) -> Result<Comment, DomainError> {
        let ip = user_ip.and_then(|i| IpNetwork::from_str(i).ok());
        let id = Uuid::now_v7();
        sqlx::query!("INSERT INTO comments (id, lettering_id, content, user_ip) VALUES ($1, $2, $3, $4)", id, lettering_id, content, ip).execute(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        sqlx::query!("UPDATE letterings SET comments_count = comments_count + 1 WHERE id = $1", lettering_id).execute(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(Comment { id, lettering_id, content, user_ip: ip, created_at: chrono::Utc::now() })
    }

    async fn get_comments(&self, lettering_id: Uuid) -> Result<Vec<Comment>, DomainError> {
        let rows = sqlx::query_as!(Comment, r#"SELECT id, lettering_id, content, user_ip as "user_ip: _", created_at FROM comments WHERE lettering_id = $1 ORDER BY created_at DESC"#, lettering_id)
            .fetch_all(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(rows)
    }

    async fn has_liked(&self, lettering_id: Uuid, user_ip: &str) -> Result<bool, DomainError> {
        let ip = IpNetwork::from_str(user_ip).map_err(|e| DomainError::ValidationError(e.to_string()))?;
        let exists = sqlx::query_scalar!(r#"SELECT EXISTS(SELECT 1 FROM likes WHERE lettering_id = $1 AND user_ip = $2) as "exists!""#, lettering_id, ip).fetch_one(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(exists)
    }

    async fn get_likes_count(&self, lettering_id: Uuid) -> Result<i32, DomainError> {
        let count = sqlx::query_scalar!("SELECT likes_count FROM letterings WHERE id = $1", lettering_id).fetch_one(&self.pool).await.map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        Ok(count)
    }
}