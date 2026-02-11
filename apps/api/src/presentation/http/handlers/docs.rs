use axum::Json;

pub async fn api_docs() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "openapi": "3.0.0",
        "info": {
            "title": "Through Your Letters API",
            "version": "1.0.0"
        },
        "paths": {
            "/health": { "get": { "summary": "Health check" } },
            "/api/v1/letterings": { "get": { "summary": "List letterings" } },
            "/api/v1/letterings/upload": { "post": { "summary": "Upload lettering" } },
            "/api/v1/letterings/{id}": {
                "get": { "summary": "Get lettering by id" },
                "delete": { "summary": "Delete lettering by id" }
            },
            "/api/v1/letterings/{id}/comments": {
                "get": { "summary": "List comments for lettering" },
                "post": { "summary": "Add comment for lettering" }
            },
            "/api/v1/letterings/{id}/like": { "post": { "summary": "Toggle like" } },
            "/api/v1/letterings/{id}/similar": { "get": { "summary": "Get similar letterings" } },
            "/api/v1/letterings/{id}/download": { "get": { "summary": "Redirect to original image" } },
            "/api/v1/letterings/{id}/revisits": {
                "get": { "summary": "Get revisit links for lettering" },
                "post": { "summary": "Create revisit link for lettering" }
            },
            "/api/v1/geo/markers": { "get": { "summary": "Get map markers" } },
            "/api/v1/geo/nearby": { "get": { "summary": "Get nearby markers" } },
            "/api/v1/geo/coverage": { "get": { "summary": "Get pin-code coverage data" } },
            "/api/v1/cities": { "get": { "summary": "List cities" } },
            "/api/v1/cities/{id}": { "get": { "summary": "Get city detail" } },
            "/api/v1/cities/{id}/stats": { "get": { "summary": "Get city neighborhood stats" } },
            "/api/v1/docs": { "get": { "summary": "OpenAPI spec" } },
            "/ws/feed": { "get": { "summary": "WebSocket live feed" } }
        }
    }))
}
