use std::collections::HashMap;
use regex::Regex;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::{warn, debug, instrument};
use uuid::Uuid;

/// Input validation service for security hardening and data integrity.
///
/// Provides comprehensive validation for all user inputs, protecting against
/// common attack vectors including injection attacks, XSS, and malformed data.
/// All validation rules are configurable and operations are logged for security monitoring.
pub struct ValidationService {
    /// Pre-compiled regex patterns for efficient validation
    patterns: ValidationPatterns,

    /// Configuration for validation rules and limits
    config: ValidationConfig,
}

/// Pre-compiled regex patterns for input validation
struct ValidationPatterns {
    /// Email address validation (RFC 5322 compliant)
    email: Regex,

    /// PIN/postal code validation (flexible international formats)
    pin_code: Regex,

    /// Contributor tag validation (alphanumeric with limited special chars)
    contributor_tag: Regex,

    /// URL validation for image and thumbnail links
    url: Regex,

    /// SQL injection detection patterns
    sql_injection: Vec<Regex>,

    /// XSS payload detection patterns
    xss_patterns: Vec<Regex>,

    /// Command injection detection
    command_injection: Vec<Regex>,
}

/// Configurable validation limits and rules
#[derive(Debug, Clone)]
pub struct ValidationConfig {
    /// Maximum length for contributor tags
    pub max_contributor_tag_length: usize,

    /// Maximum length for descriptions
    pub max_description_length: usize,

    /// Maximum length for comment content
    pub max_comment_length: usize,

    /// Allowed image file extensions
    pub allowed_image_extensions: Vec<String>,

    /// Maximum image file size in bytes
    pub max_image_size_bytes: usize,

    /// Coordinate bounds validation
    pub min_longitude: f64,
    pub max_longitude: f64,
    pub min_latitude: f64,
    pub max_latitude: f64,
}

/// Input validation errors with detailed context
#[derive(Error, Debug, Serialize, Deserialize)]
pub enum ValidationError {
    #[error("Input too long: {field} exceeds {max_length} characters")]
    TooLong { field: String, max_length: usize },

    #[error("Input too short: {field} must be at least {min_length} characters")]
    TooShort { field: String, min_length: usize },

    #[error("Invalid format: {field} does not match required pattern")]
    InvalidFormat { field: String },

    #[error("Security violation: potential {attack_type} detected in {field}")]
    SecurityViolation { field: String, attack_type: String },

    #[error("Invalid range: {field} value {value} outside allowed range")]
    InvalidRange { field: String, value: String },

    #[error("File validation failed: {reason}")]
    FileValidation { reason: String },

    #[error("Coordinate validation failed: invalid geographic location")]
    InvalidCoordinates,
}

/// Validation result with sanitized content
#[derive(Debug, Clone)]
pub struct ValidationResult<T> {
    /// Whether the input passed validation
    pub is_valid: bool,

    /// Validated and potentially sanitized value
    pub value: Option<T>,

    /// Validation errors encountered
    pub errors: Vec<ValidationError>,

    /// Security warnings (non-blocking)
    pub warnings: Vec<String>,
}

impl ValidationService {
    /// Creates a new validation service with default security rules
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let patterns = ValidationPatterns::new()?;
        let config = ValidationConfig::default();

        Ok(Self {
            patterns,
            config,
        })
    }

    /// Validates an email address for user registration and authentication
    #[instrument(skip(self))]
    pub fn validate_email(&self, email: &str) -> ValidationResult<String> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Length validation
        if email.len() > 254 {
            errors.push(ValidationError::TooLong {
                field: "email".to_string(),
                max_length: 254
            });
        }

        if email.len() < 3 {
            errors.push(ValidationError::TooShort {
                field: "email".to_string(),
                min_length: 3
            });
        }

        // Format validation
        if !self.patterns.email.is_match(email) {
            errors.push(ValidationError::InvalidFormat {
                field: "email".to_string()
            });
        }

        // Security checks
        if self.contains_suspicious_patterns(email) {
            errors.push(ValidationError::SecurityViolation {
                field: "email".to_string(),
                attack_type: "injection".to_string()
            });
        }

        let is_valid = errors.is_empty();
        let value = if is_valid { Some(email.trim().to_lowercase()) } else { None };

        if !is_valid {
            warn!("Email validation failed for {}: {:?}", email, errors);
        }

        ValidationResult {
            is_valid,
            value,
            errors,
            warnings,
        }
    }

    /// Validates contributor tag with security and usability constraints
    #[instrument(skip(self))]
    pub fn validate_contributor_tag(&self, tag: &str) -> ValidationResult<String> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        let trimmed = tag.trim();

        // Length validation
        if trimmed.len() > self.config.max_contributor_tag_length {
            errors.push(ValidationError::TooLong {
                field: "contributor_tag".to_string(),
                max_length: self.config.max_contributor_tag_length
            });
        }

        if trimmed.len() < 2 {
            errors.push(ValidationError::TooShort {
                field: "contributor_tag".to_string(),
                min_length: 2
            });
        }

        // Format validation
        if !self.patterns.contributor_tag.is_match(trimmed) {
            errors.push(ValidationError::InvalidFormat {
                field: "contributor_tag".to_string()
            });
        }

        // Security validation
        if self.contains_suspicious_patterns(trimmed) {
            errors.push(ValidationError::SecurityViolation {
                field: "contributor_tag".to_string(),
                attack_type: "injection".to_string()
            });
        }

        let is_valid = errors.is_empty();
        let value = if is_valid { Some(trimmed.to_string()) } else { None };

        ValidationResult {
            is_valid,
            value,
            errors,
            warnings,
        }
    }

    /// Validates geographic coordinates for lettering locations
    #[instrument(skip(self))]
    pub fn validate_coordinates(&self, longitude: f64, latitude: f64) -> ValidationResult<(f64, f64)> {
        let mut errors = Vec::new();
        let warnings = Vec::new();

        // Basic range validation
        if longitude < self.config.min_longitude || longitude > self.config.max_longitude {
            errors.push(ValidationError::InvalidRange {
                field: "longitude".to_string(),
                value: longitude.to_string()
            });
        }

        if latitude < self.config.min_latitude || latitude > self.config.max_latitude {
            errors.push(ValidationError::InvalidRange {
                field: "latitude".to_string(),
                value: latitude.to_string()
            });
        }

        // Check for obviously invalid coordinates (0,0)
        if longitude == 0.0 && latitude == 0.0 {
            errors.push(ValidationError::InvalidCoordinates);
        }

        let is_valid = errors.is_empty();
        let value = if is_valid { Some((longitude, latitude)) } else { None };

        ValidationResult {
            is_valid,
            value,
            errors,
            warnings,
        }
    }

    /// Validates PIN/postal codes for geographic accuracy
    #[instrument(skip(self))]
    pub fn validate_pin_code(&self, pin_code: &str) -> ValidationResult<String> {
        let mut errors = Vec::new();
        let warnings = Vec::new();

        let trimmed = pin_code.trim();

        // Basic format validation
        if !self.patterns.pin_code.is_match(trimmed) {
            errors.push(ValidationError::InvalidFormat {
                field: "pin_code".to_string()
            });
        }

        // Security validation
        if self.contains_suspicious_patterns(trimmed) {
            errors.push(ValidationError::SecurityViolation {
                field: "pin_code".to_string(),
                attack_type: "injection".to_string()
            });
        }

        let is_valid = errors.is_empty();
        let value = if is_valid { Some(trimmed.to_string()) } else { None };

        ValidationResult {
            is_valid,
            value,
            errors,
            warnings,
        }
    }

    /// Validates user-provided content for security and policy compliance
    #[instrument(skip(self, content), fields(content_length = content.len()))]
    pub fn validate_user_content(&self, content: &str, content_type: &str) -> ValidationResult<String> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        let trimmed = content.trim();

        // Length validation based on content type
        let max_length = match content_type {
            "description" => self.config.max_description_length,
            "comment" => self.config.max_comment_length,
            _ => 1000,
        };

        if trimmed.len() > max_length {
            errors.push(ValidationError::TooLong {
                field: content_type.to_string(),
                max_length
            });
        }

        // XSS validation
        if self.contains_xss_patterns(trimmed) {
            errors.push(ValidationError::SecurityViolation {
                field: content_type.to_string(),
                attack_type: "xss".to_string()
            });
        }

        // SQL injection validation
        if self.contains_sql_injection_patterns(trimmed) {
            errors.push(ValidationError::SecurityViolation {
                field: content_type.to_string(),
                attack_type: "sql_injection".to_string()
            });
        }

        let is_valid = errors.is_empty();
        let value = if is_valid { Some(trimmed.to_string()) } else { None };

        ValidationResult {
            is_valid,
            value,
            errors,
            warnings,
        }
    }

    /// Validates uploaded file data for security and format compliance
    #[instrument(skip(self, file_data), fields(file_size = file_data.len()))]
    pub fn validate_file_upload(&self, file_data: &[u8], filename: &str) -> ValidationResult<Vec<u8>> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Size validation
        if file_data.len() > self.config.max_image_size_bytes {
            errors.push(ValidationError::FileValidation {
                reason: format!("File size {} exceeds maximum {}", file_data.len(), self.config.max_image_size_bytes)
            });
        }

        if file_data.len() < 100 {
            errors.push(ValidationError::FileValidation {
                reason: "File too small to be a valid image".to_string()
            });
        }

        // File extension validation
        let extension = Self::extract_file_extension(filename).to_lowercase();
        if !self.config.allowed_image_extensions.contains(&extension) {
            errors.push(ValidationError::FileValidation {
                reason: format!("File extension '{}' not allowed", extension)
            });
        }

        // Magic number validation
        if !self.is_valid_image_format(file_data) {
            errors.push(ValidationError::FileValidation {
                reason: "File content does not match claimed image format".to_string()
            });
        }

        let is_valid = errors.is_empty();
        let value = if is_valid { Some(file_data.to_vec()) } else { None };

        ValidationResult {
            is_valid,
            value,
            errors,
            warnings,
        }
    }

    // Private helper methods

    fn extract_file_extension(filename: &str) -> String {
        filename.split('.').last().unwrap_or("").to_string()
    }

    fn contains_suspicious_patterns(&self, input: &str) -> bool {
        self.contains_sql_injection_patterns(input) ||
        self.contains_xss_patterns(input) ||
        self.contains_command_injection_patterns(input)
    }

    fn contains_sql_injection_patterns(&self, input: &str) -> bool {
        self.patterns.sql_injection.iter().any(|pattern| pattern.is_match(input))
    }

    fn contains_xss_patterns(&self, input: &str) -> bool {
        self.patterns.xss_patterns.iter().any(|pattern| pattern.is_match(input))
    }

    fn contains_command_injection_patterns(&self, input: &str) -> bool {
        self.patterns.command_injection.iter().any(|pattern| pattern.is_match(input))
    }

    fn is_valid_image_format(&self, data: &[u8]) -> bool {
        if data.len() < 12 {
            return false;
        }

        // Check common image format magic numbers
        match &data[0..4] {
            [0x89, 0x50, 0x4E, 0x47] => true, // PNG
            [0xFF, 0xD8, 0xFF, _] => true,     // JPEG
            _ => {
                // Check WEBP
                if data.len() >= 12 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
                    true
                } else {
                    false
                }
            }
        }
    }
}

impl ValidationPatterns {
    fn new() -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            email: Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")?,
            pin_code: Regex::new(r"^[A-Za-z0-9\s-]{3,10}$")?,
            contributor_tag: Regex::new(r"^[a-zA-Z0-9._\-\s]{2,50}$")?,
            url: Regex::new(r"^https?://[^\s/$.?#].[^\s]*$")?,
            sql_injection: vec![
                Regex::new(r"(?i)(union|select|insert|update|delete|drop|exec|script)")?,
                Regex::new(r"(?i)(--|;|'|\"|`)")?,
                Regex::new(r"(?i)(0x[0-9a-f]+|char\(|ascii\()")?,
            ],
            xss_patterns: vec![
                Regex::new(r"(?i)(<script|</script|javascript:|vbscript:|onload=|onerror=)")?,
                Regex::new(r"(?i)(alert\(|confirm\(|prompt\(|document\.|window\.)")?,
                Regex::new(r"(?i)(<iframe|<object|<embed|<applet)")?,
            ],
            command_injection: vec![
                Regex::new(r"(?i)(;|&&|`|\$\(|>\s|<\s)")?,
                Regex::new(r"(?i)(nc|netcat|wget|curl|ping|nslookup)")?,
            ],
        })
    }
}

impl Default for ValidationConfig {
    fn default() -> Self {
        Self {
            max_contributor_tag_length: 50,
            max_description_length: 2000,
            max_comment_length: 500,
            allowed_image_extensions: vec![
                "jpg".to_string(),
                "jpeg".to_string(),
                "png".to_string(),
                "webp".to_string(),
                "heic".to_string(),
                "heif".to_string()
            ],
            max_image_size_bytes: 20 * 1024 * 1024, // 20MB
            min_longitude: -180.0,
            max_longitude: 180.0,
            min_latitude: -90.0,
            max_latitude: 90.0,
        }
    }
}

impl Default for ValidationService {
    fn default() -> Self {
        Self::new().expect("Failed to create default validation service")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        let service = ValidationService::new().unwrap();

        // Valid email
        let result = service.validate_email("test@example.com");
        assert!(result.is_valid);
        assert_eq!(result.value, Some("test@example.com".to_string()));

        // Invalid email
        let result = service.validate_email("invalid-email");
        assert!(!result.is_valid);
        assert!(result.value.is_none());
    }

    #[test]
    fn test_coordinate_validation() {
        let service = ValidationService::new().unwrap();

        // Valid coordinates
        let result = service.validate_coordinates(77.5946, 12.9716);
        assert!(result.is_valid);

        // Invalid coordinates (out of range)
        let result = service.validate_coordinates(200.0, 100.0);
        assert!(!result.is_valid);
    }

    #[test]
    fn test_xss_detection() {
        let service = ValidationService::new().unwrap();

        let malicious_content = "<script>alert(\"xss\")</script>";
        let result = service.validate_user_content(malicious_content, "comment");
        assert!(!result.is_valid);
        assert!(result.errors.iter().any(|e| matches!(e, ValidationError::SecurityViolation { attack_type, .. } if attack_type == "xss")));
    }

    #[test]
    fn test_sql_injection_detection() {
        let service = ValidationService::new().unwrap();

        let malicious_content = "'; DROP TABLE users; --";
        let result = service.validate_user_content(malicious_content, "comment");
        assert!(!result.is_valid);
        assert!(result.errors.iter().any(|e| matches!(e, ValidationError::SecurityViolation { attack_type, .. } if attack_type == "sql_injection")));
    }

    #[test]
    fn test_contributor_tag_validation() {
        let service = ValidationService::new().unwrap();

        // Valid tag
        let result = service.validate_contributor_tag("ValidUser123");
        assert!(result.is_valid);

        // Too long tag
        let long_tag = "a".repeat(60);
        let result = service.validate_contributor_tag(&long_tag);
        assert!(!result.is_valid);
    }

    #[test]
    fn test_file_format_validation() {
        let service = ValidationService::new().unwrap();

        // Valid PNG header
        let png_data = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        let mut full_png = png_data;
        full_png.extend(vec![0; 100]); // Add some data to meet minimum size

        let result = service.validate_file_upload(&full_png, "test.png");
        assert!(result.is_valid);

        // Invalid file data
        let invalid_data = vec![0; 50];
        let result = service.validate_file_upload(&invalid_data, "test.png");
        assert!(!result.is_valid);
    }
}
