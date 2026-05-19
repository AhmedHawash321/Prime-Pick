mod config;
mod tools;
mod agent;
mod server;
mod moderator;

use anyhow::Result;
use clap::Parser;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use crate::config::Config;

#[derive(Parser, Debug)]
#[command(
    name = "product-store-agent",
    author = "Ahmad <ahmedhawash321@gmail.com>",
    version = "0.1.0",
    about = "AI Product Store Assistant — Ollama + Rig"
)]
struct Args {
    #[arg(short = 's', long = "server", default_value = "false")]
    server: bool,

    #[arg(
        help = "What to search for (CLI mode only)",
        value_name = "QUERY",
        required = false
    )]
    query: Option<String>,

    #[arg(short = 'm', long = "model", env = "OLLAMA_MODEL")]
    model: Option<String>,

    #[arg(short = 'q', long = "quick", default_value = "false")]
    quick: bool,

    #[arg(short = 'v', long = "verbose", default_value = "false")]
    verbose: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    init_logging(args.verbose)?;

    info!("Product Store Agent starting...");

    let mut config = Config::from_env()?;

    if let Some(model) = args.model {
        config.model = model;
    }

    config.validate()?;

    info!(
        model = %config.model,
        backend = %config.backend_api_url,
        "Config ready"
    );

    if args.server {
        info!("Mode: HTTP Server");
        server::start_server(config).await?;
    } else {
        use crate::agent::ProductAgent;
        use tracing::error;

        let query = match args.query {
            Some(q) => q,
            None => {
                eprintln!("Error: Please provide a QUERY or use --server flag");
                eprintln!();
                eprintln!("Examples:");
                eprintln!("  cargo run -- \"Fridge\"           # CLI mode");
                eprintln!("  cargo run -- --server            # HTTP server mode");
                eprintln!("  cargo run -- --quick \"Laptop\"   # Fast CLI search");
                return Ok(());
            }
        };

        info!("Mode: CLI");

        let agent = ProductAgent::new(config);

        let result = if args.quick {
            info!("CLI: raw backend search (no LLM)");
            agent.raw_backend_search(&query).await
        } else {
            info!("CLI: full AI assistant");
            agent.handle_query(&query).await
        };

        match result {
            Ok(response) => {
                println!();
                println!("{}", "═".repeat(60));
                println!("  RESULTS: {}", query.to_uppercase());
                println!("{}", "═".repeat(60));
                println!();
                println!("{}", response);
                println!();
                println!("{}", "─".repeat(60));
            }
            Err(e) => {
                error!(error = %e, "Failed");
                eprintln!("\nError: {}", e);

                let err = e.to_string();
                if err.contains("connection refused") {
                    eprintln!("\nCheck that Ollama is running:");
                    eprintln!("   ollama serve");
                    eprintln!("   And your backend is running on port 5000");
                } else if err.contains("not found") {
                    eprintln!("\nPull the model:");
                    eprintln!("   ollama pull llama3.2");
                }

                return Err(e);
            }
        }
    }

    Ok(())
}

fn init_logging(verbose: bool) -> Result<()> {
    let level = if verbose { Level::DEBUG } else { Level::INFO };

    let subscriber = FmtSubscriber::builder()
        .with_max_level(level)
        .with_target(false)
        .with_file(false)
        .with_line_number(false)
        .finish();

    tracing::subscriber::set_global_default(subscriber)
        .map_err(|e| anyhow::anyhow!("Failed to init logging: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_query_parsing() {
        let args = Args::parse_from(["test", "Fridge"]);
        assert_eq!(args.query, Some("Fridge".to_string()));
        assert!(!args.quick);
        assert!(!args.server);
    }

    #[test]
    fn test_server_flag() {
        let args = Args::parse_from(["test", "--server"]);
        assert!(args.server);
        assert!(args.query.is_none());
    }

    #[test]
    fn test_quick_flag() {
        let args = Args::parse_from(["test", "--quick", "Laptop"]);
        assert!(args.quick);
        assert_eq!(args.query, Some("Laptop".to_string()));
    }

    #[test]
    fn test_model_override() {
        let args = Args::parse_from(["test", "-m", "mistral", "query"]);
        assert_eq!(args.model, Some("mistral".to_string()));
    }
}