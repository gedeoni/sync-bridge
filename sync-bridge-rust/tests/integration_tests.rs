// tests/integration_tests.rs
use reqwest::{Client, StatusCode};
use serde_json::{json, Value};
use sqlx::SqlitePool;
use tokio::net::TcpListener;
use tokio::sync::broadcast;

use sync_bridge_rust::config::Config;
use sync_bridge_rust::create_app;
use sync_bridge_rust::db::init_db;
use sync_bridge_rust::graphql::schema::Employee;

const AUTH_HEADER: &str = "x-auth-token";
const TOKEN: &str = "test-token";

async fn spawn_app() -> (String, SqlitePool) {
    // 1. Force use of in-memory SQLite shared database for tests
    let config = Config {
        port: 0, // OS will assign a random free port
        auth_token: TOKEN.to_string(),
        database_url: "sqlite::memory:?cache=shared".to_string(),
    };

    // 2. Initialize DB & run migrations
    let pool = init_db(&config.database_url).await.unwrap();

    // 3. Setup broadcast channel
    let (broadcast_tx, _broadcast_rx) = broadcast::channel::<Employee>(100);

    // 4. Create Axum Router
    let app = create_app(pool.clone(), config, broadcast_tx);

    // 5. Bind listener to random port
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    // 6. Spawn Axum server task
    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    (format!("http://{}", addr), pool)
}

#[tokio::test]
async fn test_healthz_is_public() {
    let (base_url, _) = spawn_app().await;
    let client = Client::new();

    let res = client
        .get(&format!("{}/api/v1/healthz", base_url))
        .send()
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body: Value = res.json().await.unwrap();
    assert_eq!(body["status"], 200);
    assert_eq!(body["message"], "Service is healthy");
    assert!(body["data"]["read"].as_bool().unwrap());
    assert!(body["data"]["write"].as_bool().unwrap());
}

#[tokio::test]
async fn test_auth_protection_on_rest_sync() {
    let (base_url, _) = spawn_app().await;
    let client = Client::new();

    // Without token
    let res = client
        .post(&format!("{}/api/v1/sync", base_url))
        .json(&json!({"model": "customers", "data": []}))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // With wrong token
    let res = client
        .post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, "wrong-token")
        .json(&json!({"model": "customers", "data": []}))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // With correct token
    let res = client
        .post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&json!({
            "model": "customers",
            "data": [
                { "email": "auth@example.com", "first_name": "Auth", "last_name": "Test" }
            ]
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_customer_sync_success_and_duplicates() {
    let (base_url, _) = spawn_app().await;
    let client = Client::new();

    let payload = json!({
        "model": "customers",
        "data": [
            { "email": "alice@example.com", "first_name": "Alice", "last_name": "Smith", "default_currency": "USD" }
        ]
    });

    // Create Customer
    let res = client
        .post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&payload)
        .send()
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body: Value = res.json().await.unwrap();
    assert_eq!(body["data"]["results"][0]["status"], "created");
    assert!(body["data"]["results"][0]["id"].as_i64().is_some());

    // Duplicate email check
    let res = client
        .post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&payload)
        .send()
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::CONFLICT);
    let err_body: Value = res.json().await.unwrap();
    assert!(err_body["message"]
        .as_str()
        .unwrap()
        .contains("Duplicate entry: field 'EMAIL' already exists"));
}

#[tokio::test]
async fn test_product_sync_success() {
    let (base_url, _) = spawn_app().await;
    let client = Client::new();

    let payload = json!({
        "model": "products",
        "data": [
            { "name": "Widget", "price": 999, "currency": "USD", "active": true, "weight_grams": 150 }
        ]
    });

    let res = client
        .post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&payload)
        .send()
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body: Value = res.json().await.unwrap();
    assert_eq!(body["data"]["results"][0]["status"], "created");
}

#[tokio::test]
async fn test_order_sync_validation_and_calculations() {
    let (base_url, _) = spawn_app().await;
    let client = Client::new();

    // 1. First sync customer and product to resolve foreign keys
    client.post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&json!({
            "model": "customers",
            "data": [{ "id": 100, "email": "customer@example.com", "first_name": "C", "last_name": "T" }]
        }))
        .send()
        .await
        .unwrap();

    client
        .post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&json!({
            "model": "products",
            "data": [{ "id": 200, "name": "Widget P", "price": 500 }]
        }))
        .send()
        .await
        .unwrap();

    // 2. Order without items and without amount fails
    let res = client
        .post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&json!({
            "model": "orders",
            "data": [{ "order_number": "ORD-1", "customer_id": 100, "status": "pending" }]
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 3. Order with wrong amount sum fails
    let res = client
        .post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&json!({
            "model": "orders",
            "data": [{
                "order_number": "ORD-1",
                "customer_id": 100,
                "status": "pending",
                "amount": 1000, // Sum should be 500 * 3 = 1500
                "items": [{ "product_id": 200, "qty": 3, "unit_price": 500 }]
            }]
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 4. Order with correct items succeeds
    let res = client
        .post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&json!({
            "model": "orders",
            "data": [{
                "order_number": "ORD-1",
                "customer_id": 100,
                "status": "pending",
                "items": [{ "product_id": 200, "qty": 3, "unit_price": 500 }]
            }]
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body: Value = res.json().await.unwrap();
    assert_eq!(body["data"]["results"][0]["status"], "created");
}

#[tokio::test]
async fn test_stats_handler() {
    let (base_url, _) = spawn_app().await;
    let client = Client::new();

    // Perform a sync
    client
        .post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&json!({
            "model": "customers",
            "data": [{ "email": "stats@example.com", "first_name": "S", "last_name": "T" }]
        }))
        .send()
        .await
        .unwrap();

    let res = client
        .get(&format!("{}/api/v1/sync/stats", base_url))
        .header(AUTH_HEADER, TOKEN)
        .send()
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK);
    let body: Value = res.json().await.unwrap();
    assert!(body["data"]["total"].as_i64().unwrap() >= 1);
    assert_eq!(body["data"]["successful"].as_i64().unwrap(), 1);
}

#[tokio::test]
async fn test_sync_history_list_details_and_delete() {
    let (base_url, _) = spawn_app().await;
    let client = Client::new();

    // 1. Perform a sync to populate history
    client
        .post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&json!({
            "model": "customers",
            "data": [{ "email": "hist@example.com", "first_name": "H", "last_name": "T" }]
        }))
        .send()
        .await
        .unwrap();

    // 2. List history
    let res = client
        .get(&format!("{}/api/v1/sync-history?page=1&size=5", base_url))
        .header(AUTH_HEADER, TOKEN)
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body: Value = res.json().await.unwrap();
    let content = &body["data"]["content"];
    assert!(!content.as_array().unwrap().is_empty());
    let hist_id = content[0]["id"].as_i64().unwrap();

    // 3. Get single history item
    let res = client
        .get(&format!("{}/api/v1/sync-history/{}", base_url, hist_id))
        .header(AUTH_HEADER, TOKEN)
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 4. Delete history item
    let res = client
        .delete(&format!("{}/api/v1/sync-history/{}", base_url, hist_id))
        .header(AUTH_HEADER, TOKEN)
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);

    // 5. Verify deleted
    let res = client
        .get(&format!("{}/api/v1/sync-history/{}", base_url, hist_id))
        .header(AUTH_HEADER, TOKEN)
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_failed_sync_transaction_rollback_but_history_preserved() {
    let (base_url, pool) = spawn_app().await;
    let client = Client::new();

    // Try to sync customer with a missing first_name (triggers validation failure)
    let res = client
        .post(&format!("{}/api/v1/sync", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&json!({
            "model": "customers",
            "data": [{ "email": "fail_tx@example.com", "first_name": "", "last_name": "Test" }]
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    // 1. Verify no customer was inserted in DB
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM customers WHERE email = 'fail_tx@example.com'")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(count, 0);

    // 2. Verify history contains a FAILED entry with the validation failure reason
    let hist: Value = client
        .get(&format!("{}/api/v1/sync-history", base_url))
        .header(AUTH_HEADER, TOKEN)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    let content = hist["data"]["content"].as_array().unwrap();
    assert!(!content.is_empty());
    assert_eq!(content[0]["status"], "FAILED");
    assert!(content[0]["failureReason"]
        .as_str()
        .unwrap()
        .contains("Validation failed"));
}

#[tokio::test]
async fn test_graphql_public_access_and_mutation_auth() {
    let (base_url, _) = spawn_app().await;
    let client = Client::new();

    // 1. hello query is public
    let res = client
        .post(&format!("{}/graphql", base_url))
        .json(&json!({ "query": "query { hello }" }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body: Value = res.json().await.unwrap();
    assert_eq!(body["data"]["hello"], "Hello from Sync Bridge");

    // 2. employees query is public without header
    let res = client
        .post(&format!("{}/graphql", base_url))
        .json(&json!({ "query": "query { employees { id firstName } }" }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 3. createEmployee mutation without header returns 401 Unauthorized
    let res = client.post(&format!("{}/graphql", base_url))
        .json(&json!({
            "query": "mutation($data: CreateEmployeeInput!) { createEmployee(data: $data) { id firstName } }",
            "variables": {
                "data": {
                    "id": 999,
                    "employeeId": "E999",
                    "firstName": "Jane",
                    "lastName": "Doe",
                    "email": "jane.doe@example.com"
                }
            }
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::UNAUTHORIZED);

    // 4. createEmployee mutation with correct header succeeds
    let res = client.post(&format!("{}/graphql", base_url))
        .header(AUTH_HEADER, TOKEN)
        .json(&json!({
            "query": "mutation($data: CreateEmployeeInput!) { createEmployee(data: $data) { id firstName lastName fullName } }",
            "variables": {
                "data": {
                    "id": 999,
                    "employeeId": "E999",
                    "firstName": "Jane",
                    "lastName": "Doe",
                    "email": "jane.doe@example.com"
                }
            }
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body: Value = res.json().await.unwrap();
    assert_eq!(body["data"]["createEmployee"]["id"], 999);
    assert_eq!(body["data"]["createEmployee"]["fullName"], "Jane Doe");
}
