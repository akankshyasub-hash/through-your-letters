use crate::domain::lettering::{entity::Lettering, errors::DomainError, repository::LetteringRepository};
use super::dto::SearchRequest;

pub struct SearchLetteringsUseCase {
    repository: Box<dyn LetteringRepository>,
}

impl SearchLetteringsUseCase {
    pub fn new(repository: Box<dyn LetteringRepository>) -> Self {
        Self { repository }
    }

    pub async fn execute(&self, request: SearchRequest) -> Result<Vec<Lettering>, DomainError> {
        self.repository.search(&request.query).await
    }
}
