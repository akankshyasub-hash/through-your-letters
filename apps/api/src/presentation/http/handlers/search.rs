use axum::http::StatusCode;
pub async fn search_letterings() -> Result<&'static str, StatusCode> {
    Ok("Search placeholder")
}
