use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::ipnetwork::IpNetwork;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, TS, sqlx::FromRow)]
#[ts(export)]
pub struct Comment {
    pub id: Uuid,
    pub lettering_id: Uuid,
    pub content: String,
    #[ts(skip)]
    pub user_ip: Option<IpNetwork>,
    pub created_at: DateTime<Utc>,
}
