use anyhow::Result;
use aws_config::{BehaviorVersion, Region};
use aws_credential_types::Credentials;
use aws_sdk_s3::{Client, primitives::ByteStream};
use bytes::Bytes;
use uuid::Uuid;

pub struct R2StorageService {
    client: Client,
    bucket_name: String,
    public_url: String,
}

impl R2StorageService {
    pub async fn new(
        access_key_id: String,
        secret_access_key: String,
        endpoint: String,
        bucket_name: String,
        region: String,
        public_url: String,
    ) -> Result<Self> {
        let credentials = Credentials::new(access_key_id, secret_access_key, None, None, "r2-static");
        let config = aws_config::defaults(BehaviorVersion::latest())
            .region(Region::new(region))
            .endpoint_url(endpoint)
            .credentials_provider(credentials)
            .load()
            .await;
        let client = Client::new(&config);
        Ok(Self { client, bucket_name, public_url })
    }

    pub async fn upload_image(&self, image_data: Bytes, city_id: Uuid, lettering_id: Uuid, content_type: &str) -> Result<String> {
        let key = format!("{}/{}.jpg", city_id, lettering_id);
        self.client.put_object()
            .bucket(&self.bucket_name)
            .key(&key)
            .body(ByteStream::from(image_data))
            .content_type(content_type)
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("Upload failed: {}", e))?;
        Ok(format!("{}/{}", self.public_url, key))
    }

    pub async fn delete_image(&self, key: &str) -> Result<()> {
        self.client.delete_object().bucket(&self.bucket_name).key(key).send().await?;
        Ok(())
    }
}
