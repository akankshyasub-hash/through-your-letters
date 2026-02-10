use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub database_url: String,
    pub database_max_connections: u32,
    pub redis_url: String,
    pub redis_max_connections: u32,
    pub r2_access_key_id: String,
    pub r2_secret_access_key: String,
    pub r2_endpoint: String,
    pub r2_bucket_name: String,
    pub r2_region: String,
    pub r2_public_url: String,
    pub host: String,
    pub port: u16,
    pub cors_allowed_origins: String,
    pub rate_limit_uploads_per_day: u32,
    pub rate_limit_uploads_per_ip: u32,
    pub enable_ml_processing: bool,
    pub ml_model_path: String,
    pub enable_virus_scan: bool,
    pub environment: String,
    pub admin_email: String,
    pub admin_password_hash: String,
    pub jwt_secret: String,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            database_url: std::env::var("DATABASE_URL")?,
            database_max_connections: std::env::var("DATABASE_MAX_CONNECTIONS")
                .unwrap_or("10".into())
                .parse()?,
            redis_url: std::env::var("REDIS_URL")?,
            redis_max_connections: std::env::var("REDIS_MAX_CONNECTIONS")
                .unwrap_or("10".into())
                .parse()?,
            r2_access_key_id: std::env::var("R2_ACCESS_KEY_ID")?,
            r2_secret_access_key: std::env::var("R2_SECRET_ACCESS_KEY")?,
            r2_endpoint: std::env::var("R2_ENDPOINT")?,
            r2_bucket_name: std::env::var("R2_BUCKET_NAME")?,
            r2_region: std::env::var("R2_REGION").unwrap_or("auto".into()),
            r2_public_url: std::env::var("R2_PUBLIC_URL")?,
            host: std::env::var("HOST").unwrap_or("0.0.0.0".into()),
            port: std::env::var("PORT").unwrap_or("3000".into()).parse()?,
            cors_allowed_origins: std::env::var("CORS_ALLOWED_ORIGINS")
                .unwrap_or("http://localhost:5173".into()),
            rate_limit_uploads_per_day: std::env::var("RATE_LIMIT_UPLOADS_PER_DAY")
                .unwrap_or("20".into())
                .parse()?,
            rate_limit_uploads_per_ip: std::env::var("RATE_LIMIT_UPLOADS_PER_IP")
                .unwrap_or("20".into())
                .parse()?,
            enable_ml_processing: std::env::var("ENABLE_ML_PROCESSING")
                .unwrap_or("true".into())
                .parse()?,
            ml_model_path: std::env::var("ML_MODEL_PATH")
                .unwrap_or("./models/text_detector.onnx".into()),
            enable_virus_scan: std::env::var("ENABLE_VIRUS_SCAN")
                .unwrap_or("false".into())
                .parse()?,
            environment: std::env::var("ENVIRONMENT").unwrap_or("development".into()),
            admin_email: std::env::var("ADMIN_EMAIL")
                .unwrap_or("admin@throughyourletters.online".into()),
            admin_password_hash: std::env::var("ADMIN_PASSWORD_HASH").unwrap_or_else(|_| {
                // Default: SHA256 of "changeme" — MUST be overridden in production
                "057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86".into()
            }),
            jwt_secret: std::env::var("JWT_SECRET")
                .unwrap_or_else(|_| "ttl-dev-jwt-secret-change-in-production".into()),
        })
    }
}
