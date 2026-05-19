use axum::{
    extract::{Json, State},
    http::Method,
    response::Json as ResponseJson,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};
use std::sync::Arc;
use tracing::info;

use crate::agent::ProductAgent;
use crate::config::Config;
use crate::moderator::{CommentModerator, ModerationDecision};

// ── Shared App State ─────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AppState {
    pub agent: Arc<ProductAgent>,
    pub moderator: Arc<CommentModerator>,
}

// ── Chat DTOs ─────────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct ChatRequest {
    pub message: String,
}

#[derive(Serialize)]
pub struct ChatResponse {
    pub reply: String,
    pub success: bool,
}

// ── Moderation DTOs ───────────────────────────────────────────────────────────

/// The frontend sends this payload before persisting the comment in the database.
#[derive(Deserialize)]
pub struct ModerateRequest {
    /// The actual raw text of the comment.
    pub comment: String,
    /// Product title — helps the AI understand the evaluation context.
    pub product_title: String,
    /// Database comment ID (useful if processing asynchronous post-save moderation).
    pub comment_id: Option<String>,
    /// User ID — useful for indexing and maintaining audit logs.
    pub user_id: Option<String>,
}

#[derive(Serialize)]
pub struct ModerateResponse {
    /// Result state: "approved" | "rejected" | "pending"
    pub decision: String,
    /// Reason behind the evaluation — can be preserved or displayed on the frontend.
    pub reason: String,
    /// AI model evaluation confidence score bounded between (0.0 → 1.0).
    pub confidence: f32,
    /// On "pending" status, returns back the target comment_id to flag it for manual review.
    pub pending_comment_id: Option<String>,
    pub success: bool,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async fn chat_handler(
    State(state): State<AppState>,
    Json(body): Json<ChatRequest>,
) -> ResponseJson<ChatResponse> {
    match state.agent.handle_query(&body.message).await {
        Ok(reply) => ResponseJson(ChatResponse {
            reply,
            success: true,
        }),
        Err(e) => ResponseJson(ChatResponse {
            reply: format!("Agent Error: {}", e),
            success: false,
        }),
    }
}

async fn moderate_handler(
    State(state): State<AppState>,
    Json(body): Json<ModerateRequest>,
) -> ResponseJson<ModerateResponse> {
    info!(
        comment = %body.comment,
        product = %body.product_title,
        user_id = ?body.user_id,
        "Received moderation request"
    );

    match state.moderator.moderate(&body.comment, &body.product_title).await {
        Ok(result) => {
            let decision_str = match result.decision {
                ModerationDecision::Approved => "approved",
                ModerationDecision::Rejected => "rejected",
                ModerationDecision::Pending  => "pending",
            };

            info!(
                decision = %decision_str,
                confidence = %result.confidence,
                reason = %result.reason,
                "Moderation decision made"
            );

            // If the decision is pending, we pass back the comment_id to allow the backend to flag it in the DB.
            let pending_id = if result.decision == ModerationDecision::Pending {
                body.comment_id.clone()
            } else {
                None
            };

            ResponseJson(ModerateResponse {
                decision: decision_str.to_string(),
                reason: result.reason,
                confidence: result.confidence,
                pending_comment_id: pending_id,
                success: true,
            })
        }
        Err(e) => {
            // If the processing pipeline faults, default safely to "pending" instead of throwing a hard reject.
            info!(error = %e, "Moderation error — defaulting to pending");
            ResponseJson(ModerateResponse {
                decision: "pending".to_string(),
                reason: format!("Moderation service error: {} — flagged for admin review", e),
                confidence: 0.0,
                pending_comment_id: body.comment_id,
                success: false,
            })
        }
    }
}

/// Simple health check — essential for automated Docker probes and load balancer health verifications.
async fn health_handler() -> &'static str {
    "OK"
}

// ── Server Bootstrap ──────────────────────────────────────────────────────────

pub async fn start_server(config: Config) -> anyhow::Result<()> {
    let state = AppState {
        agent: Arc::new(ProductAgent::new(config.clone())),
        moderator: Arc::new(CommentModerator::new(config)),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::POST, Method::GET])
        .allow_headers(Any);

    let app = Router::new()
        .route("/chat",     post(chat_handler))
        .route("/moderate", post(moderate_handler)) 
        .route("/health",   get(health_handler))
        .with_state(state)
        .layer(cors);

    let addr = "0.0.0.0:8080";
    println!("AI Agent Server running on http://{}", addr);
    println!("   POST /chat      → AI chatbot");
    println!("   POST /moderate  → Comment moderation");
    println!("   GET  /health    → Health check");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}