use async_trait::async_trait;
use uuid::Uuid;
use super::comment::Comment;
use crate::domain::lettering::errors::DomainError;

#[async_trait]
pub trait SocialRepository: Send + Sync {
    async fn toggle_like(&self, lettering_id: Uuid, user_ip: &str) -> Result<(bool, i32), DomainError>;
    async fn add_comment(&self, lettering_id: Uuid, content: String, user_ip: Option<&str>) -> Result<Comment, DomainError>;
    async fn get_comments(&self, lettering_id: Uuid) -> Result<Vec<Comment>, DomainError>;
    async fn has_liked(&self, lettering_id: Uuid, user_ip: &str) -> Result<bool, DomainError>;
    async fn get_likes_count(&self, lettering_id: Uuid) -> Result<i32, DomainError>;
}