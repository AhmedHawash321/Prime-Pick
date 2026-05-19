use anyhow::Result;
use rig::client::{CompletionClient, Nothing};
use rig::completion::Prompt;
use rig::providers::ollama;
use rig::tool::Tool;
use std::sync::Arc;
use tracing::info;

use crate::config::Config;
use crate::tools::{ProductSearchTool, SearchArgs};

// ── System Prompt ────────────────────────────────────────────────────────────

const STORE_SYSTEM_PROMPT: &str = r#"You are a helpful Product Store Assistant for Prime-Pick, an Egyptian e-commerce store.

CRITICAL RULES — NEVER BREAK THESE:
1. NEVER mention products, brands, prices, or stock that you did not get from a product_search tool call.
2. NEVER invent product names, prices, or availability from your own knowledge.
3. If product_search returns empty results → try a SHORTER, SIMPLER query before giving up.
4. NEVER suggest products from outside our store unless search returned them.

SEARCH STRATEGY — VERY IMPORTANT:
- Always use SHORT, SIMPLE product keywords for product_search.
- Extract the core product keyword from the user's message.
- Examples:
  User: "im looking for something to keep my food cold" → search "fridge"
  User: "i need a device to watch movies on" → search "tv"  
  User: "something to wash my clothes" → search "washing machine"
  User: "i want a new phone" → search "phone"
  User: "show me laptops under 20000" → search "laptop"
- NEVER search with the full user sentence.
- If first search returns nothing, try an even simpler keyword.

WHEN TO SEARCH:
- User asks about ANY product, price, availability → call product_search FIRST with a SHORT keyword.

WHEN NOT TO SEARCH:
- Greetings, thanks, general chat → respond naturally.

TOOL USAGE:
- Pass query as a PLAIN SHORT STRING only.
- Correct:     product_search(query="fridge")
- Correct:     product_search(query="phone")
- Incorrect: product_search(query="something to keep food cold")
- Incorrect: product_search(query={"type":"string","value":"fridge"})

RESPONSE FORMAT:
- Only mention products from search results with real prices in EGP.
- If search returns nothing → "Sorry, we don't carry that item currently."
- Keep responses short and friendly."#;

// ── Hallucination signals ────────────────────────────────────────────────────

/// Phrases that indicate the LLM invented products not from our store.
/// If any are found in the response we return a safe fallback message.
const HALLUCINATION_SIGNALS: &[&str] = &[
    "nike jacket",
    "adidas jacket",
    "shelves",
    "cabinets",
    "drawers",
    "our current price list shows",
    "we have a wide range",
    "brands like nike",
    "brands like adidas",
];

// ── ProductAgent ─────────────────────────────────────────────────────────────

pub struct ProductAgent {
    config: Config,
    search_tool: Arc<ProductSearchTool>,
}

impl ProductAgent {
    /// Initialize the agent with configuration and the search tool.
    pub fn new(config: Config) -> Self {
        let search_tool = Arc::new(ProductSearchTool::new(
            config.max_product_results,
            config.backend_api_url.clone(),
        ));
        Self {
            config,
            search_tool,
        }
    }

    // ── Public entry points ──────────────────────────────────────────────────

    /// Handle any user message — fast-path for common phrases, LLM for the rest.
    pub async fn handle_query(&self, query: &str) -> Result<String> {
        info!(query = %query, "Processing query");

        let q = query.trim().to_lowercase();

        // Fast-path 1: canned responses for greetings/small talk
        if let Some(response) = Self::instant_response(&q) {
            info!("Fast-path response triggered");
            return Ok(response.to_owned());
        }

        // Fast-path 2: keyword extraction for natural language product queries.
        // This ensures product_search gets "fridge" not "something to keep food cold".
        if let Some(keyword) = Self::extract_product_keyword(&q) {
            info!(keyword = %keyword, "Keyword extracted — direct search");
            let result = self
                .search_tool
                .call(SearchArgs {
                    query: keyword.to_string(),
                })
                .await
                .map_err(|e| anyhow::anyhow!("Search failed: {}", e))?;

            if result.contains("No products found") {
                return Ok(format!("Sorry, we don't carry {} in our store right now. Can I help you find something else?", keyword));
            }

            return Ok(format!(
                "Here's what I found for {}:\n\n{}",
                keyword, result
            ));
        }

        // Default: full LLM agent for complex queries
        self.run_store_agent(query).await
    }

    /// Direct backend search — bypasses LLM entirely (used with --quick flag).
    pub async fn raw_backend_search(&self, query: &str) -> Result<String> {
        info!(query = %query, "Direct backend GraphQL lookup");

        let result = self
            .search_tool
            .call(SearchArgs {
                query: query.to_string(),
            })
            .await
            .map_err(|e| anyhow::anyhow!("Backend search failed: {}", e))?;

        Ok(result)
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    /// Returns a canned response for greetings / small talk without hitting the LLM.
    fn instant_response(q: &str) -> Option<&'static str> {
        // Greetings
        if matches!(
            q,
            "hi" | "hello" | "hey" | "هاي" | "مرحبا" | "السلام عليكم" | "هلو"
        ) {
            return Some(
                "Hello! Welcome to Prime-Pick 👋 How can I help you find a product today?",
            );
        }
        // Thanks
        if q.contains("thank")
            || q.contains("thanks")
            || q.contains("شكرا")
            || q == "thx"
            || q == "ty"
        {
            return Some("You're welcome! 😊 Is there anything else I can help you with?");
        }
        // Goodbye
        if matches!(
            q,
            "bye" | "goodbye" | "see you" | "cya" | "مع السلامة" | "باي"
        ) {
            return Some("Goodbye! Happy shopping at Prime-Pick 🛍️");
        }
        // How are you
        if q.contains("how are you") || q.contains("how r u") || q.contains("كيف حالك") {
            return Some(
                "I'm doing great and ready to help! What product are you looking for today?",
            );
        }
        // Acknowledgements
        if matches!(
            q,
            "ok" | "okay" | "cool" | "great" | "nice" | "good" | "perfect" | "awesome"
        ) {
            return Some("Great! Let me know if you need help finding any product 😊");
        }
        // Yes / No
        if matches!(q, "yes" | "no" | "yeah" | "nope" | "yep" | "nah") {
            return Some("Got it! Feel free to ask me about any product in our store.");
        }
        // Identity
        if q.contains("who are you") || q.contains("what are you") || q.contains("من أنت") {
            return Some("I'm the Prime-Pick AI Assistant 🤖 I can help you find products, check prices, and check stock availability!");
        }
        // Help
        if matches!(q, "help" | "مساعدة") {
            return Some("I can help you with:\n• Finding products (e.g. 'show me fridges')\n• Checking prices (e.g. 'how much is a Samsung TV')\n• Stock availability\n\nJust ask! 😊");
        }

        None
    }

    /// Extract simple product keyword from natural language queries.
    /// This prevents the LLM from passing long sentences to product_search.
    fn extract_product_keyword(query: &str) -> Option<&'static str> {
        let q = query.to_lowercase();
        // Food/kitchen
        if q.contains("cold") || q.contains("fridge") || q.contains("refrigerat") || q.contains("تلاجة") {
            return Some("fridge");
        }
        if q.contains("wash") || q.contains("laundry") || q.contains("غسالة") {
            return Some("washing machine");
        }
        // Electronics
        if q.contains("phone") || q.contains("mobile") || q.contains("iphone") || q.contains("تليفون") {
            return Some("phone");
        }
        if q.contains("laptop") || q.contains("computer") || q.contains("لابتوب") {
            return Some("laptop");
        }
        if q.contains("tv") || q.contains("television") || q.contains("watch movie") || q.contains("تلفزيون") {
            return Some("tv");
        }
        if q.contains("coffee") || q.contains("قهوة") {
            return Some("coffee machine");
        }
        None
    }

    /// Run the full LLM agent with product_search tool access.
    async fn run_store_agent(&self, query: &str) -> Result<String> {
        let client = ollama::Client::new(Nothing)
            .map_err(|e| anyhow::anyhow!("Failed to create Ollama client: {}", e))?;

        let tool = (*self.search_tool).clone();

        let agent = client
            .agent(&self.config.model)
            .preamble(STORE_SYSTEM_PROMPT)
            .temperature(0.0)
            .max_tokens(500)
            .tool(tool)
            .build();

        info!("Sending to LLM: model={}", self.config.model);

        let response = agent
            .prompt(query)
            .await
            .map_err(|e| anyhow::anyhow!("Store agent failed: {}", e))?;

        if self.contains_hallucination(&response) {
            info!("Hallucination detected — returning safe fallback");
            return Ok(
                "I can only provide information about products available in our store. \
              Please try searching for a specific product name!"
                    .to_string(),
            );
        }

        Ok(response)
    }

    /// Check whether the LLM response contains invented product info.
    fn contains_hallucination(&self, response: &str) -> bool {
        let lower = response.to_lowercase();
        HALLUCINATION_SIGNALS
            .iter()
            .any(|signal| lower.contains(signal))
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instant_response_greetings() {
        assert!(ProductAgent::instant_response("hi").is_some());
        assert!(ProductAgent::instant_response("hello").is_some());
        assert!(ProductAgent::instant_response("مرحبا").is_some());
    }

    #[test]
    fn test_instant_response_thanks() {
        assert!(ProductAgent::instant_response("thank you").is_some());
        assert!(ProductAgent::instant_response("thanks").is_some());
        assert!(ProductAgent::instant_response("thx").is_some());
    }

    #[test]
    fn test_instant_response_goodbye() {
        assert!(ProductAgent::instant_response("bye").is_some());
        assert!(ProductAgent::instant_response("goodbye").is_some());
        assert!(ProductAgent::instant_response("مع السلامة").is_some());
    }

    #[test]
    fn test_product_query_goes_to_llm() {
        // Product queries must return None so they reach the LLM + search tool
        assert!(ProductAgent::instant_response("show me fridges").is_none());
        assert!(ProductAgent::instant_response("what is the price of samsung tv").is_none());
        assert!(ProductAgent::instant_response("do you have laptops").is_none());
    }

    #[test]
    fn test_hallucination_detection() {
        let agent = ProductAgent::new(Config::default());
        assert!(agent.contains_hallucination("We have Nike jacket and Adidas shoes"));
        assert!(agent.contains_hallucination("We have shelves and cabinets available"));
        assert!(!agent.contains_hallucination("We have a fridge for 42399 EGP"));
    }

    #[test]
    fn test_agent_creation() {
        let config = Config::default();
        let agent = ProductAgent::new(config);
        assert_eq!(Arc::strong_count(&agent.search_tool), 1);
    }
}