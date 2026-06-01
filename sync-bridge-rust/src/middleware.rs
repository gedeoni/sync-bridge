// src/middleware.rs
use crate::config::Config;
use crate::errors::AppError;
use axum::{
    body::Body,
    extract::State,
    http::{header, Request},
    middleware::Next,
    response::{IntoResponse, Response},
};
use uuid::Uuid;

pub const REQ_ID_HEADER: &str = "X-Request-Id";

// --- Request ID Middleware ---
pub async fn request_id_middleware(mut request: Request<Body>, next: Next) -> impl IntoResponse {
    let req_id = Uuid::new_v4().to_string();
    request.extensions_mut().insert(req_id.clone());

    let mut response = next.run(request).await;

    // Attach request ID to response headers
    if let Ok(header_val) = header::HeaderValue::from_str(&req_id) {
        response.headers_mut().insert(REQ_ID_HEADER, header_val);
    }

    response
}

// --- Route-sensitive Authentication Middleware ---
pub async fn auth_middleware(
    State(config): State<Config>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, AppError> {
    let uri_path = req.uri().path();

    // 1. Skip auth for Health check
    if uri_path == "/api/v1/healthz" || uri_path == "/healthz" {
        return Ok(next.run(req).await);
    }

    // 2. Special handling for GraphQL POST endpoints
    if uri_path == "/graphql" || uri_path.ends_with("/graphql") {
        // Read body to inspect if it contains employee creation mutations
        let (parts, body) = req.into_parts();
        let bytes = axum::body::to_bytes(body, usize::MAX)
            .await
            .map_err(|e| AppError::BadRequest(format!("Failed to read request body: {}", e)))?;

        let body_str = String::from_utf8_lossy(&bytes);

        // Token is required only for GraphQL mutations that create employees
        if body_str.contains("createEmployee")
            || (body_str.contains("mutation") && body_str.contains("create"))
        {
            let token = parts
                .headers
                .get("x-auth-token")
                .and_then(|h| h.to_str().ok());

            if token != Some(&config.auth_token) {
                return Err(AppError::Unauthorized);
            }
        }

        // Reassemble request with cached body and proceed
        let recreated_body = Body::from(bytes);
        let recreated_req = Request::from_parts(parts, recreated_body);
        return Ok(next.run(recreated_req).await);
    }

    // 3. Standard REST routes: /api/v1/sync, /api/v1/sync-history (or any /api/v1/...)
    if uri_path.starts_with("/api/v1/sync") || uri_path.starts_with("/api/v1/sync-history") {
        let token = req
            .headers()
            .get("x-auth-token")
            .and_then(|h| h.to_str().ok());

        if token != Some(&config.auth_token) {
            return Err(AppError::Unauthorized);
        }
    }

    Ok(next.run(req).await)
}
