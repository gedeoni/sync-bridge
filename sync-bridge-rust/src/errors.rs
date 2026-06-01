// src/errors.rs
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use lazy_static::lazy_static;
use regex::Regex;
use serde_json::json;
use std::collections::HashMap;
use tracing::error;

lazy_static! {
    static ref RE_SQLITE_UNIQUE: Regex =
        Regex::new(r"UNIQUE constraint failed: \w+\.(\w+)").unwrap();
}

#[derive(Debug)]
pub enum AppError {
    Unauthorized,
    Validation { errors: HashMap<String, String> },
    Conflict(String),
    BadRequest(String),
    NotFound(String),
    Internal(sqlx::Error),
    Serialization(serde_json::Error),
    Generic(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::Unauthorized => write!(f, "Access Denied"),
            AppError::Validation { .. } => write!(f, "Validation failed"),
            AppError::Conflict(msg) => write!(f, "Conflict: {}", msg),
            AppError::BadRequest(msg) => write!(f, "Bad Request: {}", msg),
            AppError::NotFound(msg) => write!(f, "Not Found: {}", msg),
            AppError::Internal(err) => write!(f, "Internal database error: {}", err),
            AppError::Serialization(err) => write!(f, "Serialization error: {}", err),
            AppError::Generic(msg) => write!(f, "Generic error: {}", msg),
        }
    }
}

impl std::error::Error for AppError {}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::Internal(err)
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Serialization(err)
    }
}

impl AppError {
    pub fn status_code(&self) -> StatusCode {
        match self {
            AppError::Unauthorized => StatusCode::UNAUTHORIZED,
            AppError::Validation { .. } => StatusCode::BAD_REQUEST,
            AppError::Conflict(_) => StatusCode::CONFLICT,
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Serialization(_) => StatusCode::BAD_REQUEST,
            AppError::Generic(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

// Convert SQLite error constraint into structured Conflict error if applicable
pub fn handle_db_error(err: sqlx::Error) -> AppError {
    if let sqlx::Error::Database(ref db_err) = err {
        let msg = db_err.message();
        if msg.contains("UNIQUE constraint failed") {
            if let Some(cap) = RE_SQLITE_UNIQUE.captures(msg) {
                let field = cap.get(1).map_or("UNKNOWN", |m| m.as_str()).to_uppercase();
                return AppError::Conflict(format!(
                    "Duplicate entry: field '{}' already exists",
                    field
                ));
            }
            return AppError::Conflict("Duplicate entry: unique constraint violated".to_string());
        }
    }
    AppError::Internal(err)
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let message = match &self {
            AppError::Unauthorized => "Access Denied".to_string(),
            AppError::Conflict(msg) => msg.clone(),
            AppError::BadRequest(msg) => msg.clone(),
            AppError::NotFound(msg) => msg.clone(),
            AppError::Validation { .. } => "Validation failed".to_string(),
            AppError::Internal(e) => {
                error!("Database error: {:?}", e);
                "Internal Server Error".to_string()
            }
            AppError::Serialization(e) => {
                error!("Serialization error: {:?}", e);
                "Bad Request".to_string()
            }
            AppError::Generic(msg) => {
                error!("Generic internal error: {}", msg);
                "Internal Server Error".to_string()
            }
        };

        let mut body = json!({
            "status": status.as_u16(),
            "message": message
        });

        if let AppError::Validation { errors } = self {
            if let Some(obj) = body.as_object_mut() {
                obj.insert("errors".to_string(), json!(errors));
            }
        }

        (status, Json(body)).into_response()
    }
}

// Implement async-graphql's ErrorExtensions so we can return errors cleanly in GraphQL resolvers
impl async_graphql::ErrorExtensions for AppError {
    fn extend(&self) -> async_graphql::Error {
        async_graphql::Error::new(self.to_string())
    }
}
