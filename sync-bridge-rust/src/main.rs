// src/main.rs
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tokio::sync::broadcast;
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use sync_bridge_rust::config::Config;
use sync_bridge_rust::create_app;
use sync_bridge_rust::db::init_db;
use sync_bridge_rust::graphql::schema::Employee;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Initialize structured logging
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    info!("Starting sync-bridge-rust...");

    // 2. Load Configuration
    let config = Config::from_env();
    info!("Loaded configuration: {:?}", config);

    // 3. Initialize SQLite Connection Pool & run migrations
    let pool = init_db(&config.database_url).await?;

    // 4. Create broadcast channel for GraphQL subscriptions
    let (broadcast_tx, _broadcast_rx) = broadcast::channel::<Employee>(100);

    // 5. Construct Router using create_app from the library
    let app = create_app(pool, config.clone(), broadcast_tx);

    // 6. Boot server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    info!("Server listening on http://{}", addr);

    let listener = TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
