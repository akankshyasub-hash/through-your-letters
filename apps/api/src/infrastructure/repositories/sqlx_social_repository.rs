use crate::domain::social::{comment::Comment, like::Like, repository::SocialRepository};
use crate::domain::lettering::errors::DomainError;
use async_trait::async_trait;
use sqlx::PgPool;
use sqlx::types::ipnetwork::IpNetwork;
use uuid::Uuid;
use std::str::FromStr;

pub struct SqlxSocialRepository {
    pool: PgPool,
}

impl SqlxSocialRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl SocialRepository for SqlxSocialRepository {
    async fn add_like(&self, lettering_id: Uuid, user_ip: &str) -> Result<Like, DomainError> {
        let ip_network = IpNetwork::from_str(user_ip)
            .map_err(|e| DomainError::ValidationError(e.to_string()))?;
        
        let like_id = Uuid::now_v7();
        
        sqlx::query!(
            r#"INSERT INTO likes (id, lettering_id, user_ip) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (lettering_id, user_ip) DO NOTHING"#,
            like_id, lettering_id, ip_network
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        
        sqlx::query!("UPDATE letterings SET likes_count = likes_count + 1 WHERE id = $1", lettering_id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        
        Ok(Like {
            id: like_id,
            lettering_id,
            user_ip: ip_network,
            created_at: chrono::Utc::now(),
        })
    }

    async fn remove_like(&self, lettering_id: Uuid, user_ip: &str) -> Result<(), DomainError> {
        let ip_network = IpNetwork::from_str(user_ip)
            .map_err(|e| DomainError::ValidationError(e.to_string()))?;
        
        sqlx::query!("DELETE FROM likes WHERE lettering_id = $1 AND user_ip = $2", lettering_id, ip_network)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        
        sqlx::query!("UPDATE letterings SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1", lettering_id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        
        Ok(())
    }

    async fn add_comment(&self, lettering_id: Uuid, content: String, user_ip: Option<&str>) -> Result<Comment, DomainError> {
        let ip_network = user_ip
            .map(|ip| IpNetwork::from_str(ip))
            .transpose()
            .map_err(|e| DomainError::ValidationError(format!("{}", e)))?;
        
        let comment_id = Uuid::now_v7();
        let now = chrono::Utc::now();
        
        sqlx::query!(
            r#"INSERT INTO comments (id, lettering_id, content, user_ip) 
            VALUES ($1, $2, $3, $4)"#,
            comment_id, lettering_id, content, ip_network
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        
        sqlx::query!("UPDATE letterings SET comments_count = comments_count + 1 WHERE id = $1", lettering_id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        
        Ok(Comment {
            id: comment_id,
            lettering_id,
            content,
            user_ip: ip_network,
            created_at: now,
        })
    }

    async fn get_comments(&self, lettering_id: Uuid) -> Result<Vec<Comment>, DomainError> {
        let comments = sqlx::query_as!(
            Comment,
            r#"SELECT id, lettering_id, content, user_ip, created_at FROM comments 
            WHERE lettering_id = $1 ORDER BY created_at DESC"#,
            lettering_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::InfrastructureError(e.to_string()))?;
        
        Ok(comments)
    }
}