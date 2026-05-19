use anyhow::Result;
use rig::client::{CompletionClient, Nothing};
use rig::completion::Prompt;
use rig::providers::ollama;
use serde::{Deserialize, Serialize};
use tracing::info;

use crate::config::Config;

// ── Types ────────────────────────────────────────────────────────────────────

/// Final moderation verdict for a comment.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ModerationDecision {
    Approved, // Safe to publish immediately
    Rejected, // Spam / scam — do not save
    Pending,  // Uncertain — send to admin dashboard
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModerationResult {
    pub decision:   ModerationDecision,
    pub reason:     String,
    pub confidence: f32, // 0.0 → 1.0
}

// ── System Prompt ────────────────────────────────────────────────────────────

const MODERATION_SYSTEM_PROMPT: &str = r#"You are a strict content moderator for Prime-Pick, an Egyptian e-commerce store.

Your job: analyze product reviews and return a JSON decision.

DEFAULT BEHAVIOR: Most reviews should be APPROVED. Only reject obvious violations.

REJECT only if the comment contains:
- Phone numbers (e.g. 010xxxxxxxx, 011xxxxxxxx)
- WhatsApp/Telegram links or mentions asking users to contact elsewhere
- External website links (http, www, .com)
- Hate speech, racism, or personal threats
- Obvious spam or competitor advertisements

APPROVE all of these (even if negative):
- Honest negative reviews: "bad quality", "wrong size", "different color"
- Short reviews: "great", "good", "ok", "bad"
- Arabic reviews expressing opinions
- Any genuine customer feedback about the product

PENDING only for genuinely ambiguous cases where you truly cannot decide.
When in doubt → APPROVE, not PENDING.

Respond ONLY with this exact JSON format, no extra text:
{
  "decision": "approved" | "rejected" | "pending",
  "reason": "brief explanation in English",
  "confidence": 0.0 to 1.0
}"#;

// ── CommentModerator ─────────────────────────────────────────────────────────

pub struct CommentModerator {
    config: Config,
}

impl CommentModerator {
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    /// Main entry: run fast-reject first, then LLM if needed.
    pub async fn moderate(&self, comment: &str, product_title: &str) -> Result<ModerationResult> {
        info!(comment = %comment, product = %product_title, "Moderating comment");

        // Fast-path: obvious spam/scam patterns caught without LLM
        if let Some(result) = self.fast_reject(comment) {
            info!("Fast-reject triggered");
            return Ok(result);
        }

        self.llm_moderate(comment, product_title).await
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    /// Rule-based filter for the most obvious violations.
    /// Returns Some(Rejected) if the comment clearly matches a spam pattern.
    fn fast_reject(&self, comment: &str) -> Option<ModerationResult> {
        let lower = comment.to_lowercase();

        // Egyptian phone numbers start with 01 and have at least 8 digits total
        let has_phone = lower.contains("01")
            && comment.chars().filter(|c| c.is_ascii_digit()).count() >= 8;

        // External links
        let has_link = lower.contains("http")
            || lower.contains("www.")
            || lower.contains(".com")
            || lower.contains(".net")
            || lower.contains("t.me/")
            || lower.contains("wa.me/");

        // WhatsApp mentions
        let has_whatsapp = lower.contains("whatsapp")
            || lower.contains("واتساب")
            || lower.contains("واتس")
            || lower.contains("wts");

        if has_phone || has_link || has_whatsapp {
            return Some(ModerationResult {
                decision:   ModerationDecision::Rejected,
                reason:     "Contains phone number, external link, or WhatsApp reference — likely spam/scam".to_string(),
                confidence: 0.99,
            });
        }

        None
    }

    /// Ask the LLM to classify the comment and return a structured decision.
    async fn llm_moderate(&self, comment: &str, product_title: &str) -> Result<ModerationResult> {
        // ollama::Client::new(Nothing) — correct API for rig-core 0.36
        std::env::set_var("OLLAMA_HOST", &self.config.ollama_base_url);
let client = ollama::Client::new(Nothing)
    .map_err(|e| anyhow::anyhow!("Failed to create Ollama client: {}", e))?;
        let agent = client
            .agent(&self.config.model)
            .preamble(MODERATION_SYSTEM_PROMPT)
            // Very low temperature for consistent, rule-following decisions
            .temperature(0.1)
            .build();

        let prompt = format!(
            "Product: \"{}\"\nComment to moderate: \"{}\"",
            product_title, comment
        );

        let raw = agent
            .prompt(&prompt)
            .await
            .map_err(|e| anyhow::anyhow!("LLM moderation failed: {}", e))?;

        self.parse_llm_response(&raw)
    }

    /// Parse the JSON response from the LLM into a ModerationResult.
    /// Handles markdown code fences and malformed JSON gracefully.
    fn parse_llm_response(&self, raw: &str) -> Result<ModerationResult> {
        // Strip markdown code fences if the LLM wrapped its response
        let cleaned = raw
            .trim()
            .trim_start_matches("```json")
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim();

        match serde_json::from_str::<serde_json::Value>(cleaned) {
            Ok(json) => {
                let decision_str = json["decision"].as_str().unwrap_or("approved");
                let decision = match decision_str {
                    "rejected" => ModerationDecision::Rejected,
                    "pending"  => ModerationDecision::Pending,
                    _          => ModerationDecision::Approved, // default → approve
                };

                let reason = json["reason"]
                    .as_str()
                    .unwrap_or("No reason provided")
                    .to_string();

                let confidence = json["confidence"].as_f64().unwrap_or(0.8) as f32;

                // Only convert rejected→pending when confidence is genuinely low.
                // Approved comments stay approved even at low confidence.
                let final_decision = match decision {
                    ModerationDecision::Rejected if confidence < 0.75 => {
                        ModerationDecision::Pending
                    }
                    other => other,
                };

                Ok(ModerationResult { decision: final_decision, reason, confidence })
            }

            Err(_) => {
                // Unparseable response → approve (don't block all comments if LLM misbehaves)
                Ok(ModerationResult {
                    decision:   ModerationDecision::Approved,
                    reason:     "LLM returned unparseable response — defaulting to approved".to_string(),
                    confidence: 0.5,
                })
            }
        }
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_moderator() -> CommentModerator {
        CommentModerator::new(Config::default())
    }

    #[test]
    fn test_fast_reject_phone_number() {
        let m = make_moderator();
        let result = m.fast_reject("تواصل معايا على 01012345678");
        assert!(result.is_some());
        assert_eq!(result.unwrap().decision, ModerationDecision::Rejected);
    }

    #[test]
    fn test_fast_reject_whatsapp() {
        let m = make_moderator();
        let result = m.fast_reject("كلمني على واتساب عشان أديك سعر أرخص");
        assert!(result.is_some());
        assert_eq!(result.unwrap().decision, ModerationDecision::Rejected);
    }

    #[test]
    fn test_fast_reject_external_link() {
        let m = make_moderator();
        let result = m.fast_reject("اشتري من www.othershop.com أرخص بكتير");
        assert!(result.is_some());
        assert_eq!(result.unwrap().decision, ModerationDecision::Rejected);
    }

    #[test]
    fn test_normal_comment_passes_fast_filter() {
        let m = make_moderator();
        // A genuine negative review must NOT be fast-rejected
        assert!(m.fast_reject("المنتج كويس بس التوصيل اتأخر شوية").is_none());
        assert!(m.fast_reject("different color than shown").is_none());
        assert!(m.fast_reject("great product").is_none());
    }

    #[test]
    fn test_parse_approved_response() {
        let m = make_moderator();
        let raw = r#"{"decision": "approved", "reason": "Genuine review", "confidence": 0.95}"#;
        let result = m.parse_llm_response(raw).unwrap();
        assert_eq!(result.decision, ModerationDecision::Approved);
    }

    #[test]
    fn test_parse_low_confidence_rejected_becomes_pending() {
        let m = make_moderator();
        let raw = r#"{"decision": "rejected", "reason": "Suspicious", "confidence": 0.55}"#;
        let result = m.parse_llm_response(raw).unwrap();
        // confidence < 0.75 on a rejected decision → escalate to pending
        assert_eq!(result.decision, ModerationDecision::Pending);
    }

    #[test]
    fn test_parse_bad_json_defaults_to_approved() {
        let m = make_moderator();
        let result = m.parse_llm_response("this is not json").unwrap();
        // Unparseable → approve (don't silently block legitimate reviews)
        assert_eq!(result.decision, ModerationDecision::Approved);
    }

    #[test]
    fn test_parse_strips_markdown_fences() {
        let m = make_moderator();
        let raw = "```json\n{\"decision\": \"approved\", \"reason\": \"ok\", \"confidence\": 0.9}\n```";
        let result = m.parse_llm_response(raw).unwrap();
        assert_eq!(result.decision, ModerationDecision::Approved);
    }
}