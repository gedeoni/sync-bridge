// src/db.rs
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::str::FromStr;
use std::time::Duration;
use tracing::info;

pub async fn init_db(database_url: &str) -> Result<SqlitePool, sqlx::Error> {
    info!(
        "Initializing database connection pool for: {}",
        database_url
    );

    let connection_options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true)
        // Enable foreign key support in SQLite (crucial for orders/order_items references)
        .pragma("foreign_keys", "ON")
        // Set busy timeout to prevent lock contentions
        .busy_timeout(Duration::from_secs(5));

    let pool = SqlitePoolOptions::new()
        .max_connections(10)
        .min_connections(1)
        .acquire_timeout(Duration::from_secs(5))
        .connect_with(connection_options)
        .await?;

    info!("Running database migrations...");
    sqlx::migrate!("./migrations").run(&pool).await?;
    info!("Database migrations executed successfully.");

    Ok(pool)
}
