// src/lib.rs
pub mod config;
pub mod db;
pub mod dto;
pub mod errors;
pub mod graphql;
pub mod handlers;
pub mod metrics;
pub mod middleware;

use async_graphql::Schema;
use async_graphql_axum::{GraphQLProtocol, GraphQLRequest, GraphQLResponse, GraphQLWebSocket};
use axum::{
    extract::{ws::WebSocketUpgrade, Extension},
    middleware::from_fn,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use sqlx::SqlitePool;
use tokio::sync::broadcast;
use tower_http::trace::TraceLayer;

use crate::config::Config;
use crate::graphql::mutation::Mutation;
use crate::graphql::query::Query;
use crate::graphql::schema::Employee;
use crate::graphql::subscription::Subscription;
use crate::handlers::health::health_handler;
use crate::handlers::history::{
    delete_history_handler, get_history_handler, list_history_handler, retry_history_handler,
    stats_handler,
};
use crate::handlers::sync::sync_handler;
use crate::metrics::get_metrics_text;
use crate::middleware::{auth_middleware, request_id_middleware};

type AppSchema = Schema<Query, Mutation, Subscription>;

// GraphQL HTTP post handler
async fn graphql_handler(schema: Extension<AppSchema>, req: GraphQLRequest) -> GraphQLResponse {
    schema.execute(req.into_inner()).await.into()
}

// GraphQL WebSocket subscription handler
async fn graphql_ws_handler(
    Extension(schema): Extension<AppSchema>,
    protocol: GraphQLProtocol,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| GraphQLWebSocket::new(socket, schema, protocol).serve())
}

// Prometheus metrics endpoint handler
async fn metrics_handler() -> String {
    get_metrics_text()
}

pub fn create_app(
    pool: SqlitePool,
    config: Config,
    broadcast_tx: broadcast::Sender<Employee>,
) -> Router {
    // Construct async-graphql Schema
    let schema = Schema::build(Query, Mutation, Subscription)
        .data(pool.clone())
        .data(broadcast_tx)
        .finish();

    Router::new()
        // Public REST routes
        .route("/api/v1/healthz", get(health_handler))
        .route("/healthz", get(health_handler))
        // Public Prometheus endpoints
        .route("/actuator/prometheus", get(metrics_handler))
        .route("/metrics", get(metrics_handler))
        // Protected REST routes (Wrapped in auth_middleware)
        .route("/api/v1/sync", post(sync_handler))
        .route("/api/v1/sync/stats", get(stats_handler))
        .route("/api/v1/sync-history", get(list_history_handler))
        .route(
            "/api/v1/sync-history/{id}",
            get(get_history_handler).delete(delete_history_handler),
        )
        .route(
            "/api/v1/sync-history/retry/{id}",
            post(retry_history_handler),
        )
        // GraphQL endpoint (WebSocket sub + HTTP post)
        .route("/graphql", post(graphql_handler).get(graphql_ws_handler))
        // Add layers and middleware
        .route_layer(axum::middleware::from_fn_with_state(
            config.clone(),
            auth_middleware,
        ))
        .layer(Extension(schema))
        .layer(from_fn(request_id_middleware))
        .layer(TraceLayer::new_for_http())
        .with_state(pool)
}
