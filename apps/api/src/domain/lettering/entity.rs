use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::ipnetwork::IpNetwork;
use ts_rs::TS;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Lettering {
    pub id: Uuid,
    pub city_id: Uuid,
    pub contributor_tag: String,
    pub image_url: String,
    pub thumbnail_urls: ThumbnailUrls,
    pub location: Coordinates,
    pub pin_code: String,
    pub detected_text: Option<String>,
    pub ml_metadata: Option<ImageMetadata>,
    pub description: Option<String>,
    pub is_lettering: bool,
    pub status: LetteringStatus,
    pub likes_count: i32,
    pub comments_count: i32,
    #[ts(skip)]
    pub uploaded_by_ip: Option<IpNetwork>,
    pub image_hash: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ThumbnailUrls {
    pub small: String,
    pub medium: String,
    pub large: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct Coordinates {
    pub r#type: String,
    pub coordinates: Vec<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ImageMetadata {
    pub style: Option<String>,
    pub script: Option<String>,
    pub confidence: Option<f32>,
    pub color_palette: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS, sqlx::Type)]
#[sqlx(type_name = "text", rename_all = "SCREAMING_SNAKE_CASE")]
#[ts(export)]
pub enum LetteringStatus {
    Pending,
    Approved,
    Rejected,
}