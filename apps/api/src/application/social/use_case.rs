use crate::domain::social::{comment::Comment, repository::SocialRepository};
use crate::domain::lettering::errors::DomainError;
use super::dto::AddCommentRequest;
use uuid::Uuid;

pub struct SocialUseCase {
    repository: Box<dyn SocialRepository>,
}

impl SocialUseCase {
    pub fn new(repository: Box<dyn SocialRepository>) -> Self {
        Self { repository }
    }

    pub async fn add_like(&self, lettering_id: Uuid, user_ip: &str) -> Result<(), DomainError> {
        self.repository.add_like(lettering_id, user_ip).await?;
        Ok(())
    }

    pub async fn add_comment(&self, request: AddCommentRequest, user_ip: Option<&str>) -> Result<Comment, DomainError> {
        self.repository.add_comment(request.lettering_id, request.content, user_ip).await
    }

    pub async fn get_comments(&self, lettering_id: Uuid) -> Result<Vec<Comment>, DomainError> {
        self.repository.get_comments(lettering_id).await
    }
}
