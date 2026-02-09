use axum::http::StatusCode;
pub async fn like_lettering() -> Result<&'static str, StatusCode> { Ok("Like") }
pub async fn add_comment() -> Result<&'static str, StatusCode> { Ok("Comment") }
pub async fn get_comments() -> Result<&'static str, StatusCode> { Ok("Comments") }
