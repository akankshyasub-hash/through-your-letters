use super::{
    handlers::{admin, analytics, cities, community, docs, gallery, geo, health, letterings, search, social, upload, ws},
    middleware::admin::require_admin,
    middleware::rate_limit::rate_limit_middleware,
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

    let upload_routes = Router::new()
        .route("/api/v1/letterings/upload", post(upload::upload_lettering))
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            rate_limit_middleware,
        ));

    Router::new()
        // Health
        .route("/health", get(health::health_check))
        // Letterings CRUD
        .route("/api/v1/letterings", get(gallery::get_letterings))
        .route("/api/v1/letterings/search", get(search::search_letterings))
        .route(
            "/api/v1/letterings/{id}",
            get(letterings::get_lettering).delete(letterings::delete_lettering),
        )
        .route(
            "/api/v1/letterings/{id}/report",
            post(letterings::report_lettering),
        )
        .route(
            "/api/v1/letterings/{id}/download",
            get(letterings::download_lettering),
        )
        .route(
            "/api/v1/letterings/{id}/similar",
            get(letterings::get_similar),
        )
        // Contributors
        .route(
            "/api/v1/contributors/{tag}",
            get(letterings::get_contributor_letterings),
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
        // Geo
        .route("/api/v1/geo/markers", get(geo::get_all_markers))
        .route("/api/v1/geo/nearby", get(geo::get_nearby_markers))
        .route("/api/v1/geo/coverage", get(geo::get_coverage))
        // Community
        .route("/api/v1/community/leaderboard", get(community::get_leaderboard))
        .route("/api/v1/collections", get(community::list_collections).post(community::create_collection))
        .route("/api/v1/collections/{id}", get(community::get_collection))
        .route("/api/v1/collections/{collection_id}/items/{lettering_id}", post(community::add_to_collection).delete(community::remove_from_collection))
        .route("/api/v1/challenges", get(community::list_challenges))
        // Cities
        .route("/api/v1/cities", get(cities::list_cities))
        .route("/api/v1/cities/{id}", get(cities::get_city))
        .route("/api/v1/cities/{id}/stats", get(cities::get_city_stats))
        // Docs
        .route("/api/v1/docs", get(docs::api_docs))
        // Revisits
        .route(
            "/api/v1/letterings/{id}/revisits",
            get(letterings::get_revisits).post(letterings::link_revisit),
        )
        // WebSocket live feed
        .route("/ws/feed", get(ws::ws_handler))
        // Admin login (unprotected)
        .route("/api/v1/admin/login", post(admin::login))
        // Admin (protected by JWT middleware)
        .merge(upload_routes)
        .merge(admin_routes)
        .with_state(state)
}
