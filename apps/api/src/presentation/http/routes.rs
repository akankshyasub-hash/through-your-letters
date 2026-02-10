use super::{
    handlers::{admin, analytics, cities, gallery, health, letterings, search, social, upload},
    middleware::admin::require_admin,
    state::AppState,
};
use axum::{
    Router, middleware,
    routing::{delete, get, post},
};

pub fn create_router(state: AppState) -> Router {
    let admin_routes = Router::new()
        .route("/api/v1/admin/moderation", get(admin::get_moderation_queue))
        .route(
            "/api/v1/admin/letterings/{id}/approve",
            post(admin::approve_lettering),
        )
        .route(
            "/api/v1/admin/letterings/{id}/reject",
            post(admin::reject_lettering),
        )
        .route(
            "/api/v1/admin/letterings/{id}",
            delete(admin::delete_any_lettering),
        )
        .route(
            "/api/v1/admin/letterings/{id}/clear-reports",
            post(admin::clear_reports),
        )
        .route("/api/v1/admin/stats", get(admin::get_stats))
        .route_layer(middleware::from_fn_with_state(state.clone(), require_admin));

    Router::new()
        // Health
        .route("/health", get(health::health_check))
        // Letterings CRUD
        .route("/api/v1/letterings", get(gallery::get_letterings))
        .route("/api/v1/letterings/upload", post(upload::upload_lettering))
        .route("/api/v1/letterings/search", get(search::search_letterings))
        .route(
            "/api/v1/letterings/{id}",
            delete(letterings::delete_lettering),
        )
        .route(
            "/api/v1/letterings/{id}/report",
            post(letterings::report_lettering),
        )
        // Analytics
        .route(
            "/api/v1/analytics/neighborhoods",
            get(analytics::get_neighborhoods),
        )
        // Social
        .route("/api/v1/letterings/{id}/like", post(social::like_lettering))
        .route(
            "/api/v1/letterings/{id}/comments",
            post(social::add_comment).get(social::get_comments),
        )
        // Cities
        .route("/api/v1/cities", get(cities::list_cities))
        // Admin login (unprotected)
        .route("/api/v1/admin/login", post(admin::login))
        // Admin (protected by JWT middleware)
        .merge(admin_routes)
        .with_state(state)
}
