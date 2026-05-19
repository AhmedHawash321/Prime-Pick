use anyhow::{Context, Result};
use dotenvy::dotenv;
use std::env;

/// Central configuration loaded from environment variables / .env file.
/// Every field here matches what agent.rs, moderator.rs, and tools.rs expect.
#[derive(Debug, Clone)]
pub struct Config {
    /// Ollama model name — e.g. "llama3.2", "mistral"
    pub model: String,

    /// Base URL for the Ollama API — e.g. "http://localhost:11434"
    /// Passed directly to ollama::Client so agents talk to the right host
    pub ollama_base_url: String,

    /// GraphQL endpoint of your backend — e.g. "http://localhost:5000/graphql"
    pub backend_api_url: String,

    /// LLM sampling temperature (0.0 = deterministic, 1.0 = creative)
    pub temperature: f64,

    /// Maximum number of products returned per search query
    pub max_product_results: usize,
}

impl Config {
    /// Load config from environment variables.
    /// Reads a .env file if present (via dotenvy); silently skips if missing.
    pub fn from_env() -> Result<Self> {
        let _ = dotenv(); // load .env — ignore error if file doesn't exist

        let model = env::var("OLLAMA_MODEL")
            .unwrap_or_else(|_| "llama3.2".to_string());

        let ollama_base_url = env::var("OLLAMA_API_BASE_URL")
            .unwrap_or_else(|_| "http://localhost:11434".to_string());

        // Required — no sensible default since it's deployment-specific
        let backend_api_url = env::var("BACKEND_API_URL")
            .context("BACKEND_API_URL is required — set it in .env or environment")?;

        let temperature = env::var("TEMPERATURE")
            .unwrap_or_else(|_| "0.3".to_string())
            .parse::<f64>()
            .context("TEMPERATURE must be a float (e.g. 0.3)")?;

        let max_product_results = env::var("MAX_PRODUCT_RESULTS")
            .unwrap_or_else(|_| "5".to_string())
            .parse::<usize>()
            .context("MAX_PRODUCT_RESULTS must be a positive integer")?;

        Ok(Self {
            model,
            ollama_base_url,
            backend_api_url,
            temperature,
            max_product_results,
        })
    }

    /// Sanity-check values before starting — call this in main() after from_env()
    pub fn validate(&self) -> Result<()> {
        if self.model.trim().is_empty() {
            anyhow::bail!("OLLAMA_MODEL must not be empty");
        }
        if self.temperature < 0.0 || self.temperature > 1.0 {
            anyhow::bail!(
                "TEMPERATURE must be between 0.0 and 1.0, got {}",
                self.temperature
            );
        }
        if self.max_product_results == 0 {
            anyhow::bail!("MAX_PRODUCT_RESULTS must be at least 1");
        }
        Ok(())
    }
}

/// Default config used in unit tests — no .env file required
impl Default for Config {
    fn default() -> Self {
        Self {
            model: "llama3.2".to_string(),
            ollama_base_url: "http://localhost:11434".to_string(),
            backend_api_url: "http://localhost:5000/graphql".to_string(),
            temperature: 0.3,
            max_product_results: 5,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config_is_valid() {
        let config = Config::default();
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_invalid_temperature_fails_validation() {
        let mut config = Config::default();
        config.temperature = 1.5;
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_empty_model_fails_validation() {
        let mut config = Config::default();
        config.model = "  ".to_string();
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_zero_max_results_fails_validation() {
        let mut config = Config::default();
        config.max_product_results = 0;
        assert!(config.validate().is_err());
    }
}