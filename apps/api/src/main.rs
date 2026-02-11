use api::{
    config::Config,
    infrastructure::{
        database::pool::create_pool, ml::onnx_text_detector::OnnxTextDetector,
        queue::redis_queue::RedisQueue,
        repositories::sqlx_lettering_repository::SqlxLetteringRepository,
        repositories::sqlx_social_repository::SqlxSocialRepository,
        security::virus_scanner::VirusScanner, storage::r2_storage_service::R2StorageService,
    },
    presentation::http::{routes::create_router, state::AppState},
    workers::{
        analytics_worker::AnalyticsWorker, ml_processor::MlProcessor,
        pending_auto_approve::PendingAutoApproveWorker,
    },
};
use axum::extract::DefaultBodyLimit;
use http::{Method, header};
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt::init();

    let config = Config::from_env()?;
    let db = create_pool(&config.database_url, config.database_max_connections).await?;
    let mut migrator = sqlx::migrate!("./migrations");
    migrator.set_ignore_missing(config.ignore_missing_migrations);
    migrator.run(&db).await?;

    let redis = redis::Client::open(config.redis_url.clone())?;
    let queue = Arc::new(RedisQueue::new(redis.clone()));
    let storage = Arc::new(
        R2StorageService::new(
            config.r2_access_key_id.clone(),
            config.r2_secret_access_key.clone(),
            config.r2_endpoint.clone(),
            config.r2_bucket_name.clone(),
            config.r2_public_url.clone(),
        )
        .await?,
    );

    let virus_scanner = Arc::new(VirusScanner::new(
        config.enable_virus_scan,
        std::env::var("CLAMAV_HOST").ok(),
        std::env::var("CLAMAV_PORT")
            .ok()
            .and_then(|p| p.parse().ok()),
    ));

    let (tx, _) = broadcast::channel(100);
    let broadcaster = Arc::new(tx);
    let detector = Arc::new(OnnxTextDetector::new(
        &config.ml_model_path,
        config.enable_ml_processing,
    )?);

    let state = AppState {
        db: db.clone(),
        redis,
        storage,
        ml_detector: detector.clone(),
        queue,
        virus_scanner,
        config: config.clone(),
        lettering_repo: Arc::new(SqlxLetteringRepository::new(db.clone())),
        social_repo: Arc::new(SqlxSocialRepository::new(db.clone())),
        ws_broadcaster: broadcaster.clone(),
    };

    let ml_worker = MlProcessor::new(
        db.clone(),
        detector,
        state.queue.clone(),
        config.huggingface_token.clone(),
        broadcaster,
    );
    tokio::spawn(async move { ml_worker.start().await });

    let analytics = AnalyticsWorker::new(db.clone());
    tokio::spawn(async move { analytics.start().await });

    if config.enable_pending_auto_approve {
        let pending_worker = PendingAutoApproveWorker::new(
            db.clone(),
            state.ws_broadcaster.clone(),
            config.pending_auto_approve_minutes,
            config.pending_auto_approve_interval_seconds,
            config.pending_auto_approve_batch_size,
        );
        tokio::spawn(async move { pending_worker.start().await });
    }

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
        ])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION, header::ACCEPT]);

    let app = create_router(state)
        .layer(DefaultBodyLimit::max(20 * 1024 * 1024))
        .layer(cors);

    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("ARCHIVE ONLINE AT {}", addr);
    axum::serve(listener, app).await?;
    Ok(())
}
