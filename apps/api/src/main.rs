use api::{
    config::Config,
    infrastructure::{
        database::pool::create_pool,
        queue::redis_queue::RedisQueue,
        storage::r2_storage_service::R2StorageService,
        ml::onnx_text_detector::OnnxTextDetector,
        repositories::{
            sqlx_lettering_repository::SqlxLetteringRepository,
            sqlx_social_repository::SqlxSocialRepository,
        },
    },
    presentation::http::{routes::create_router, state::AppState},
    workers::ml_processor::MlProcessor,
};
use std::sync::Arc;
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "info,api=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env()?;
    let db_pool = create_pool(&config.database_url, config.database_max_connections).await?;
    
    // Run migrations
    sqlx::migrate!("./migrations").run(&db_pool).await?;
    tracing::info!("✅ Database migrations completed");

    let ml_enabled = config.enable_ml_processing;
    let ml_model_path = &config.ml_model_path; 

    let ml_detector = Arc::new(
        OnnxTextDetector::new(ml_model_path, ml_enabled)
            .expect("Failed to initialize ML detector")
    );

    let redis_client = redis::Client::open(config.redis_url.clone())?;
    let redis_queue = Arc::new(RedisQueue::new(redis_client.clone()));
    
    let storage_service = Arc::new(R2StorageService::new(
        config.r2_access_key_id.clone(),
        config.r2_secret_access_key.clone(),
        config.r2_endpoint.clone(),
        config.r2_bucket_name.clone(),
        config.r2_public_url.clone(),
    ).await?);

    let state = AppState {
        db: db_pool.clone(),
        redis: redis_client,
        storage: storage_service.clone(),
        ml_detector: ml_detector.clone(),
        queue: redis_queue.clone(),
        config: config.clone(), 
        lettering_repo: Arc::new(SqlxLetteringRepository::new(db_pool.clone())),
        social_repo: Arc::new(SqlxSocialRepository::new(db_pool.clone())),
    };

    if config.enable_ml_processing {
        let ml_processor = MlProcessor::new(
            db_pool.clone(), 
            storage_service, 
            ml_detector.clone(),
            redis_queue
        );
        tokio::spawn(async move { ml_processor.start().await; });
    }

    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);
    let app = create_router().layer(cors).layer(TraceLayer::new_for_http()).with_state(state);
    
    let addr = format!("{}:{}", config.host, config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("✅ API Server listening on {}", addr);
    
    axum::serve(listener, app).await?;
    Ok(())
}