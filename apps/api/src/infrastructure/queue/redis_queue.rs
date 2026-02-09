use redis::{Client, AsyncCommands};
use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MlJob {
    pub lettering_id: Uuid,
    pub image_url: String,
}

pub struct RedisQueue {
    client: Client,
}

impl RedisQueue {
    pub fn new(client: Client) -> Self {
        Self { client }
    }

    pub async fn enqueue_ml_job(&self, job: MlJob) -> anyhow::Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let job_json = serde_json::to_string(&job)?;
        conn.lpush("ml_jobs", job_json).await?;
        Ok(())
    }

    pub async fn dequeue_ml_job(&self) -> anyhow::Result<Option<MlJob>> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let job_json: Option<String> = conn.brpop("ml_jobs", 1.0).await?;
        match job_json {
            Some(json) => Ok(Some(serde_json::from_str(&json)?)),
            None => Ok(None),
        }
    }
}
