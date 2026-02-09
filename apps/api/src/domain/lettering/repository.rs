use async_trait::async_trait;
use uuid::Uuid;
use super::entity::Lettering;
use super::errors::DomainError;

#[async_trait]
pub trait LetteringRepository: Send + Sync {
    async fn create(&self, lettering: &Lettering) -> Result<Lettering, DomainError>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Lettering>, DomainError>;
    async fn find_all(&self, limit: i64, offset: i64) -> Result<Vec<Lettering>, DomainError>;
    async fn update(&self, lettering: &Lettering) -> Result<Lettering, DomainError>;
    async fn delete(&self, id: Uuid) -> Result<(), DomainError>;
    async fn search(&self, query: &str) -> Result<Vec<Lettering>, DomainError>;
    async fn count_by_contributor_today(&self, contributor_tag: &str) -> Result<i64, DomainError>;
}
