use rig::completion::ToolDefinition;
use rig::tool::Tool;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use thiserror::Error;
use tracing::info;

#[derive(Error, Debug)]
pub enum SearchError {
    #[error("Network error: {0}")]
    NetworkError(#[from] reqwest::Error),
    #[error("Unexpected error: {0}")]
    AnyhowError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductResult {
    pub id: String,
    pub title: String,
    pub description: String,
    pub price: f64,
    pub stock: i32,
    #[serde(rename = "imageUrl")]
    pub image_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GraphQLResponse {
    data: Option<GraphQLData>,
    errors: Option<Vec<GraphQLError>>,
}

#[derive(Debug, Deserialize)]
struct GraphQLData {
    #[serde(rename = "getProducts")]
    get_products: Vec<ProductResult>,
}

#[derive(Debug, Deserialize)]
struct GraphQLError {
    message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductSearchTool {
    pub max_results: usize,
    pub backend_url: String,
}

impl ProductSearchTool {
    pub fn new(max_results: usize, backend_url: String) -> Self {
        Self {
            max_results,
            backend_url,
            }
        }

    async fn perform_search(&self, query: &str) -> anyhow::Result<Vec<ProductResult>> {
        info!(query = %query, "Searching product store via GraphQL");

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()?;

        let gql_query = serde_json::json!({
            "query": r#"
                query SearchProducts($limit: Int, $filter: ProductFilterInput) {
                    getProducts(limit: $limit, filter: $filter) {
                        id
                        title
                        description
                        price
                        stock
                        imageUrl
                    }
                }
            "#,
            "variables": {
                "limit": self.max_results,
                "filter": {
                    "search": query
                }
            }
        });

        let response = client
            .post(&self.backend_url)
            .header("Content-Type", "application/json")
            .json(&gql_query)
            .send()
            .await?;

        if !response.status().is_success() {
            anyhow::bail!("Backend returned HTTP {}", response.status());
        }

        let gql_response: GraphQLResponse = response
            .json()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to parse GraphQL response: {}", e))?;

        if let Some(errors) = gql_response.errors {
            let messages: Vec<String> = errors.iter().map(|e| e.message.clone()).collect();
            anyhow::bail!("GraphQL errors: {}", messages.join(", "));
        }

        let products = gql_response
            .data
            .map(|d| d.get_products)
            .unwrap_or_default();

        info!(count = products.len(), "Products found");
        Ok(products)
    }
}

// Core solution to resolve JSON deserialization errors:
// The LLM occasionally sends payloads structured like {"query": {"type":"string","value":"Fridge"}}
// because the native Tool definition enforces a "type: string" validation constraint, which causes
// the deserializer to struggle interpreting nested outputs.
// Solution: map parameters directly into a flat struct pattern using plain Strings.
#[derive(Debug, Deserialize, Serialize)]
pub struct SearchArgs {
    // Plain String payload — bypasses nested object validation bottlenecks.
    pub query: String,
}

impl Tool for ProductSearchTool {
    const NAME: &'static str = "product_search";
    type Args = SearchArgs;
    type Output = String;
    type Error = SearchError;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Search the Prime-Pick product store for products by name or category. Returns real product details including price in EGP and availability.".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": {
                        // Simplified parameter mapping description — excludes explicit "type: string" nesting
                        // within the description text to keep the LLM parsing schema contextually flat.
                        "type": "string",
                        "description": "The product name or category to search for. Example: 'fridge', 'washing machine', 'laptop'"
                    }
                },
                "required": ["query"]
            }),
        }
    }

    async fn call(&self, args: Self::Args) -> std::result::Result<Self::Output, Self::Error> {
        let products = self
            .perform_search(&args.query)
            .await
            .map_err(|e| SearchError::AnyhowError(e.to_string()))?;

        if products.is_empty() {
            return Ok(format!(
                "No products found for: \"{}\". The store might not have this item.",
                args.query
            ));
        }

        let output: String = products
            .iter()
            .enumerate()
            .map(|(i, p)| {
                let availability = if p.stock > 0 {
                    format!("✅ In Stock ({} units)", p.stock)
                } else {
                    "Out of Stock".to_string()
                };

                format!(
                    "{}. {}\n   💰 Price: {:.0} EGP\n   📦 {}\n   📝 {}\n",
                    i + 1,
                    p.title,
                    p.price,
                    availability,
                    p.description
                )
            })
            .collect::<Vec<String>>()
            .join("\n");

        Ok(output)
    }
}