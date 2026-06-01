// src/handlers/health.rs
use axum::{extract::State, http::StatusCode, response::IntoResponse};
use chrono::Utc;
use serde_json::json;
use sqlx::SqlitePool;

pub async fn health_handler(State(pool): State<SqlitePool>) -> impl IntoResponse {
    let mut read_ok = false;
    let mut write_ok = false;

    // 1. Perform database read check
    if sqlx::query("SELECT 1").execute(&pool).await.is_ok() {
        read_ok = true;
    }

    // 2. Perform database write check: insert a temp customer and delete it
    let email = format!("healthcheck-{}@example.com", uuid::Uuid::new_v4());
    let write_res = sqlx::query(
        "INSERT INTO customers (email, first_name, last_name, default_currency) VALUES (?, 'Health', 'Check', 'USD')"
    )
    .bind(&email)
    .execute(&pool)
    .await;

    if write_res.is_ok() {
        // Clean up immediately
        let _ = sqlx::query("DELETE FROM customers WHERE email = ?")
            .bind(&email)
            .execute(&pool)
            .await;
        write_ok = true;
    }

    let is_healthy = read_ok && write_ok;
    let status = if is_healthy {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    let message = if is_healthy {
        "Service is healthy"
    } else {
        "Service is unhealthy"
    };

    let data = json!({
        "read": read_ok,
        "write": write_ok,
        "timestamp": Utc::now().to_rfc3339()
    });

    let body = json!({
        "status": status.as_u16(),
        "message": message,
        "data": data
    });

    (status, axum::Json(body))
}
