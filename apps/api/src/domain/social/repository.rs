use async_trait::async_trait;
use uuid::Uuid;
use super::{comment::Comment, like::Like};
use crate::domain::lettering::errors::DomainError;

#[async_trait]
pub trait SocialRepository: Send + Sync {
    async fn add_like(&self, lettering_id: Uuid, user_ip: &str) -> Result<Like, DomainError>;
    async fn remove_like(&self, lettering_id: Uuid, user_ip: &str) -> Result<(), DomainError>;
    async fn add_comment(&self, lettering_id: Uuid, content: String, user_ip: Option<&str>) -> Result<Comment, DomainError>;
    async fn get_comments(&self, lettering_id: Uuid) -> Result<Vec<Comment>, DomainError>;
}
