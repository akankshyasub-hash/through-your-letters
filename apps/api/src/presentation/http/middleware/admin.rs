use axum::{extract::{State, ConnectInfo}, http::StatusCode, middleware::Next, response::Response};
use std::{net::SocketAddr, sync::Arc};
use crate::presentation::http::state::AppState;

pub async fn require_admin(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: axum::extract::Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let user_ip = addr.ip();
    
    let is_admin = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM admins WHERE ip_address = $1)",
        sqlx::types::ipnetwork::IpNetwork::from(user_ip)
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .unwrap_or(false);
    
    if !is_admin {
        return Err(StatusCode::FORBIDDEN);
    }
    
    Ok(next.run(req).await)
}