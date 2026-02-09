use axum::{
    extract::{Path, State, ConnectInfo},
    http::StatusCode,
    response::IntoResponse,
};
use std::net::SocketAddr;
use std::sync::Arc;
use sqlx::types::ipnetwork::IpNetwork;
use uuid::Uuid;

use crate::{
    domain::lettering::repository::LetteringRepository,
    presentation::http::{errors::AppError, state::AppState},
};

pub async fn delete_lettering(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 1. Fetch the lettering first so we can get the image URL for storage deletion
    let lettering = state
        .lettering_repo
        .find_by_id(id)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?
        .ok_or_else(|| AppError::NotFound("Lettering not found".to_string()))?;
    
    // 2. Define requester_ip (Fixes the scope error)
    let requester_ip = IpNetwork::from(addr.ip());
    
    // 3. SECURITY CHECK - Verify ownership
    if lettering.uploaded_by_ip != Some(requester_ip) {
        tracing::warn!(
            lettering_id = %id,
            requester_ip = %requester_ip,
            "SECURITY: Unauthorized delete attempt blocked"
        );
        
        return Err(AppError::Forbidden(
            "Access denied: You can only delete your own uploads".to_string()
        ));
    }

    // 4. Linked Delete: Remove from Cloudflare R2 first
    // Logic: Extract the key (path) from the URL
    let url_parts: Vec<&str> = lettering.image_url.split('/').collect();
    if let Some(filename) = url_parts.last() {
        let key = format!("letterings/{}", filename);
        
        // We log but don't fail the whole request if R2 delete fails 
        // (the file might have been deleted manually already)
        if let Err(e) = state.storage.delete(&key).await {
            tracing::error!("Failed to delete R2 object {}: {}", key, e);
        }

        // Cleanup thumbnails
        let _ = state.storage.delete(&format!("thumbnails/small/{}", filename)).await;
        let _ = state.storage.delete(&format!("thumbnails/medium/{}", filename)).await;
        let _ = state.storage.delete(&format!("thumbnails/large/{}", filename)).await;
    }
    
    // 5. Delete from Database
    state
        .lettering_repo
        .delete(id)
        .await
        .map_err(|e| AppError::InternalError(e.to_string()))?;
    
    tracing::info!(
        lettering_id = %id,
        owner_ip = %requester_ip,
        "Lettering deleted successfully from DB and Storage"
    );
    
    Ok(StatusCode::NO_CONTENT)
}