use async_trait::async_trait;
use aws_sdk_s3::{Client, primitives::ByteStream, config::BehaviorVersion};
use super::traits::StorageService;

pub struct R2StorageService {
    client: Client,
    bucket: String,
    public_url: String,
}

impl R2StorageService {
    pub async fn new(
        access_key: String,
        secret_key: String,
        endpoint: String,
        bucket: String,
        public_url: String,
    ) -> anyhow::Result<Self> {
        let credentials = aws_sdk_s3::config::Credentials::new(
            access_key,
            secret_key,
            None,
            None,
            "r2-credentials",
        );
        
        let config = aws_sdk_s3::config::Builder::new()
            // FIX: Explicitly set the behavior version to 'latest'
            .behavior_version(BehaviorVersion::latest())
            .credentials_provider(credentials)
            .endpoint_url(endpoint)
            .region(aws_sdk_s3::config::Region::new("auto"))
            .build();
        
        let client = Client::from_conf(config);
        
        Ok(Self {
            client,
            bucket,
            public_url,
        })
    }
}

#[async_trait]
impl StorageService for R2StorageService {
    async fn upload(&self, key: &str, data: Vec<u8>, content_type: &str) -> anyhow::Result<String> {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(ByteStream::from(data))
            .content_type(content_type)
            .send()
            .await?;
        
        Ok(self.get_url(key))
    }
    
    async fn delete(&self, key: &str) -> anyhow::Result<()> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await?;
        
        Ok(())
    }
    
    fn get_url(&self, key: &str) -> String {
        format!("{}/{}", self.public_url, key)
    }
}