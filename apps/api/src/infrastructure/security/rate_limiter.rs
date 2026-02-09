use redis::Client;
use anyhow::Result;

pub struct RateLimiter {
    redis: Client,
    max_per_day: u32,
}

impl RateLimiter {
    pub fn new(redis: Client, max_per_day: u32) -> Self {
        Self { redis, max_per_day }
    }

    pub async fn check_rate_limit(&self, key: &str) -> Result<bool> {
        let mut conn = self.redis.get_multiplexed_async_connection().await?;
        let count: u32 = redis::cmd("INCR")
            .arg(format!("rate_limit:{}", key))
            .query_async(&mut conn)
            .await?;
        
        if count == 1 {
            redis::cmd("EXPIRE")
                .arg(format!("rate_limit:{}", key))
                .arg(86400)
                .query_async::<_, ()>(&mut conn)
                .await?;
        }
        
        Ok(count <= self.max_per_day)
    }
}
