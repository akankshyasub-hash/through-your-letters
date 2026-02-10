#[allow(dead_code)]
use crate::infrastructure::{
    ml::onnx_text_detector::OnnxTextDetector, ml::traits::MlService, queue::redis_queue::RedisQueue,
};
use sqlx::PgPool;
use std::{collections::HashMap, sync::Arc, time::Duration};

pub struct MlProcessor {
    db: PgPool,
    detector: Arc<OnnxTextDetector>,
    queue: Arc<RedisQueue>,
    huggingface_token: Option<String>,
}

impl MlProcessor {
    pub fn new(
        db: PgPool,
        detector: Arc<OnnxTextDetector>,
        queue: Arc<RedisQueue>,
        huggingface_token: Option<String>,
    ) -> Self {
        Self {
            db,
            detector,
            queue,
            huggingface_token,
        }
    }

    pub async fn start(&self) {
        tracing::info!("ML Processor worker active. Monitoring Redis queue.");
        let client = reqwest::Client::new();

        loop {
            match self.queue.dequeue_ml_job().await {
                Ok(Some(job)) => {
                    tracing::info!("Processing ML job for lettering {}", job.lettering_id);

                    let response = client.get(&job.image_url).send().await;

                    let image_bytes = match response {
                        Ok(resp) if resp.status() == 404 => {
                            tracing::warn!(
                                "Image missing in R2 for {}, cleaning up DB",
                                job.lettering_id
                            );
                            let _ = sqlx::query!(
                                "DELETE FROM letterings WHERE id = $1",
                                job.lettering_id
                            )
                            .execute(&self.db)
                            .await;
                            continue;
                        }
                        Ok(resp) => resp.bytes().await.unwrap_or_default(),
                        Err(e) => {
                            tracing::error!("Network error fetching image: {}", e);
                            continue;
                        }
                    };

                    // 1. OCR: Try ONNX first, fall back to HuggingFace
                    let text = match self.detector.detect_text(&image_bytes).await {
                        Ok(res)
                            if !res.detected_text.is_empty()
                                && res.detected_text != "No text detected" =>
                        {
                            Some(res.detected_text)
                        }
                        _ => {
                            // Fallback: HuggingFace TrOCR
                            self.huggingface_ocr(&client, &image_bytes).await
                        }
                    };

                    // 2. Color palette extraction
                    let color_palette = self.extract_color_palette(&image_bytes);

                    // 3. Style classification
                    let style = self
                        .detector
                        .classify_style(&image_bytes)
                        .await
                        .ok()
                        .map(|s| s.style);

                    // 4. Fetch Wikipedia context for the neighborhood
                    let pin_code: Option<String> = sqlx::query_scalar!(
                        "SELECT pin_code FROM letterings WHERE id = $1",
                        job.lettering_id
                    )
                    .fetch_optional(&self.db)
                    .await
                    .ok()
                    .flatten();

                    let cultural_context = if let Some(ref pin) = pin_code {
                        self.fetch_wikipedia_context(&client, pin).await
                    } else {
                        None
                    };

                    // Build ML metadata JSON
                    let ml_color_palette = color_palette
                        .as_ref()
                        .map(|colors| serde_json::to_value(colors).unwrap_or_default());

                    let update_result = sqlx::query!(
                        r#"UPDATE letterings SET
                            detected_text = COALESCE($1, detected_text),
                            ml_style = $2,
                            ml_color_palette = COALESCE($3, ml_color_palette),
                            cultural_context = COALESCE($4, cultural_context),
                            status = 'APPROVED',
                            updated_at = NOW()
                        WHERE id = $5"#,
                        text,
                        style,
                        ml_color_palette,
                        cultural_context,
                        job.lettering_id
                    )
                    .execute(&self.db)
                    .await;

                    match update_result {
                        Ok(_) => {
                            tracing::info!("Successfully processed lettering {}", job.lettering_id)
                        }
                        Err(e) => tracing::error!(
                            "Failed to update DB for lettering {}: {}",
                            job.lettering_id,
                            e
                        ),
                    }
                }
                Ok(None) => tokio::time::sleep(Duration::from_secs(1)).await,
                Err(e) => {
                    tracing::debug!("Queue poll error (expected when idle): {:?}", e);
                    tokio::time::sleep(Duration::from_secs(2)).await;
                }
            }
        }
    }

    /// Call HuggingFace TrOCR for handwritten text recognition
    async fn huggingface_ocr(
        &self,
        client: &reqwest::Client,
        image_bytes: &[u8],
    ) -> Option<String> {
        let token = self.huggingface_token.as_ref()?;

        let response = client
            .post("https://api-inference.huggingface.co/models/microsoft/trocr-base-handwritten")
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "application/octet-stream")
            .body(image_bytes.to_vec())
            .send()
            .await
            .ok()?;

        if !response.status().is_success() {
            tracing::warn!("HuggingFace OCR returned {}", response.status());
            return None;
        }

        let body: serde_json::Value = response.json().await.ok()?;

        // HuggingFace returns [{"generated_text": "..."}]
        body.as_array()
            .and_then(|arr| arr.first())
            .and_then(|obj| obj.get("generated_text"))
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
    }

    /// Extract top 3 dominant hex color codes from an image
    fn extract_color_palette(&self, image_bytes: &[u8]) -> Option<Vec<String>> {
        let img = image::load_from_memory(image_bytes).ok()?;
        let rgb = img.to_rgb8();
        let (width, height) = rgb.dimensions();

        let mut color_counts: HashMap<String, u32> = HashMap::new();

        // Sample every 8th pixel for speed
        for y in (0..height).step_by(8) {
            for x in (0..width).step_by(8) {
                let pixel = rgb.get_pixel(x, y);
                // Quantize to reduce color space (divide into 32-step buckets)
                let r = (pixel[0] / 32) * 32;
                let g = (pixel[1] / 32) * 32;
                let b = (pixel[2] / 32) * 32;
                let hex = format!("#{:02X}{:02X}{:02X}", r, g, b);
                *color_counts.entry(hex).or_insert(0) += 1;
            }
        }

        let mut colors: Vec<_> = color_counts.into_iter().collect();
        colors.sort_by(|a, b| b.1.cmp(&a.1));

        Some(colors.into_iter().take(3).map(|(hex, _)| hex).collect())
    }

    /// Fetch Wikipedia summary for a neighborhood based on PIN code
    async fn fetch_wikipedia_context(
        &self,
        client: &reqwest::Client,
        pin_code: &str,
    ) -> Option<String> {
        let neighborhood = pin_to_neighborhood(pin_code)?;

        let url = format!(
            "https://en.wikipedia.org/api/rest_v1/page/summary/{}",
            neighborhood.replace(' ', "_")
        );

        let response = client
            .get(&url)
            .header(
                "User-Agent",
                "ThroughYourLetters/1.0 (contact@throughyourletters.online)",
            )
            .send()
            .await
            .ok()?;

        if !response.status().is_success() {
            return None;
        }

        let body: serde_json::Value = response.json().await.ok()?;
        let extract = body.get("extract")?.as_str()?;

        // Take first ~500 chars (roughly 2-3 paragraphs for short articles)
        let truncated = if extract.len() > 500 {
            // Find a sentence boundary near 500 chars
            extract[..500]
                .rfind(". ")
                .map(|i| &extract[..=i])
                .unwrap_or(&extract[..500])
                .to_string()
        } else {
            extract.to_string()
        };

        if truncated.is_empty() {
            None
        } else {
            Some(truncated)
        }
    }
}

/// Map Bengaluru PIN codes to Wikipedia-searchable neighborhood names
fn pin_to_neighborhood(pin: &str) -> Option<&'static str> {
    match pin {
        "560001" => Some("MG Road, Bangalore"),
        "560002" => Some("Shivajinagar, Bangalore"),
        "560003" => Some("Malleshwaram"),
        "560004" => Some("Basavanagudi"),
        "560005" => Some("Frazer Town, Bangalore"),
        "560008" => Some("Ulsoor"),
        "560009" => Some("Richmond Town, Bangalore"),
        "560010" => Some("Sadashivanagar, Bangalore"),
        "560011" => Some("Jayanagar, Bangalore"),
        "560018" => Some("Rajajinagar"),
        "560020" => Some("Vijayanagar, Bangalore"),
        "560021" => Some("Seshadripuram"),
        "560025" => Some("Banashankari"),
        "560027" => Some("Gandhinagar, Bangalore"),
        "560028" => Some("BTM Layout"),
        "560029" => Some("Adugodi"),
        "560030" => Some("Wilson Garden, Bangalore"),
        "560033" => Some("Peenya"),
        "560034" => Some("Koramangala"),
        "560038" => Some("Indiranagar, Bangalore"),
        "560040" => Some("Benson Town, Bangalore"),
        "560041" => Some("Hebbal, Bangalore"),
        "560047" => Some("HAL, Bangalore"),
        "560050" => Some("Yeshwanthpur"),
        "560051" => Some("Mahalakshmi Layout"),
        "560054" => Some("Domlur"),
        "560055" => Some("Chamrajpet"),
        "560066" => Some("Whitefield, Bangalore"),
        "560070" => Some("JP Nagar, Bangalore"),
        "560078" => Some("Electronic City, Bangalore"),
        "560085" => Some("Marathahalli"),
        "560095" => Some("Bellandur"),
        "560102" => Some("HSR Layout"),
        "560103" => Some("Sarjapur Road, Bangalore"),
        _ => None,
    }
}
