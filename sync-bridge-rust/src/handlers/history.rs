// src/handlers/history.rs
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::{Row, SqlitePool};

use crate::errors::AppError;

#[derive(Debug, Deserialize)]
pub struct HistoryQuery {
    pub page: Option<i64>,
    pub size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct SyncHistoryRow {
    pub id: i64,
    pub payload: String,
    pub status: String,
    #[serde(rename = "failureReason")]
    pub failure_reason: Option<String>,
    pub retries: i32,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(sqlx::FromRow)]
struct StatusOnly {
    status: String,
}

// --- GET /api/v1/sync/stats ---
pub async fn stats_handler(State(pool): State<SqlitePool>) -> Result<Response, AppError> {
    let rows = sqlx::query("SELECT status, COUNT(*) as cnt FROM sync_history GROUP BY status")
        .fetch_all(&pool)
        .await?;

    let mut successful = 0;
    let mut failed = 0;
    let mut pending_retry = 0;
    let mut invalid = 0;
    let mut total = 0;

    for r in rows {
        let status: String = r.get("status");
        let cnt: i64 = r.get("cnt");
        total += cnt;

        match status.to_uppercase().as_str() {
            "SUCCESSFUL" => successful = cnt,
            "FAILED" => failed = cnt,
            "PENDING_RETRY" => pending_retry = cnt,
            "INVALID" => invalid = cnt,
            _ => {}
        }
    }

    let body = json!({
        "status": 200,
        "message": "Stats retrieved successfully",
        "data": {
            "successful": successful,
            "failed": failed,
            "pending_retry": pending_retry,
            "invalid": invalid,
            "total": total
        }
    });

    Ok((StatusCode::OK, Json(body)).into_response())
}

// --- GET /api/v1/sync-history ---
pub async fn list_history_handler(
    State(pool): State<SqlitePool>,
    Query(q): Query<HistoryQuery>,
) -> Result<Response, AppError> {
    let page = q.page.unwrap_or(1);
    let size = q.size.unwrap_or(15);

    // Page is 1-indexed in query, database limit offset is 0-indexed
    let safe_page = if page > 0 { page - 1 } else { 0 };
    let offset = safe_page * size;

    let status_filter = q.status.map(|s| s.to_uppercase());

    let (rows, total_elements): (Vec<SyncHistoryRow>, i64) = match status_filter {
        Some(ref st) => {
            let total: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM sync_history WHERE status = ?")
                    .bind(st)
                    .fetch_one(&pool)
                    .await?;

            let results = sqlx::query_as::<_, SyncHistoryRow>(
                "SELECT id, payload, status, failure_reason, retries, \
                 strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at, \
                 strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at \
                 FROM sync_history WHERE status = ? \
                 ORDER BY id DESC LIMIT ? OFFSET ?",
            )
            .bind(st)
            .bind(size)
            .bind(offset)
            .fetch_all(&pool)
            .await?;

            (results, total)
        }
        None => {
            let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sync_history")
                .fetch_one(&pool)
                .await?;

            let results = sqlx::query_as::<_, SyncHistoryRow>(
                "SELECT id, payload, status, failure_reason, retries, \
                 strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at, \
                 strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at \
                 FROM sync_history \
                 ORDER BY id DESC LIMIT ? OFFSET ?",
            )
            .bind(size)
            .bind(offset)
            .fetch_all(&pool)
            .await?;

            (results, total)
        }
    };

    let total_pages = (total_elements as f64 / size as f64).ceil() as i64;

    let body = json!({
        "status": 200,
        "message": "Sync histories retrieved successfully",
        "data": {
            "content": rows,
            "pageable": {
                "sort": {
                    "empty": false,
                    "sorted": true,
                    "unsorted": false
                },
                "offset": offset,
                "pageNumber": safe_page,
                "pageSize": size,
                "paged": true,
                "unpaged": false
            },
            "totalElements": total_elements,
            "totalPages": total_pages,
            "size": size,
            "number": safe_page,
            "numberOfElements": rows.len(),
            "first": safe_page == 0,
            "last": safe_page >= total_pages - 1 || total_pages == 0,
            "empty": rows.is_empty()
        }
    });

    Ok((StatusCode::OK, Json(body)).into_response())
}

// --- GET /api/v1/sync-history/{id} ---
pub async fn get_history_handler(
    State(pool): State<SqlitePool>,
    Path(id): Path<i64>,
) -> Result<Response, AppError> {
    let sh = sqlx::query_as::<_, SyncHistoryRow>(
        "SELECT id, payload, status, failure_reason, retries, \
         strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at, \
         strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at \
         FROM sync_history WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Sync history not found".to_string()))?;

    let body = json!({
        "status": 200,
        "message": "Sync history retrieved successfully",
        "data": sh
    });

    Ok((StatusCode::OK, Json(body)).into_response())
}

// --- POST /api/v1/sync-history/retry/{id} ---
pub async fn retry_history_handler(
    State(pool): State<SqlitePool>,
    Path(id): Path<i64>,
) -> Result<Response, AppError> {
    // Find record first
    let sh = sqlx::query_as::<_, StatusOnly>("SELECT status FROM sync_history WHERE id = ?")
        .bind(id)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Sync history not found".to_string()))?;

    if sh.status != "FAILED" {
        return Err(AppError::BadRequest(
            "Only failed syncs can be retried".to_string(),
        ));
    }

    // Set to PENDING_RETRY
    let _ = sqlx::query(
        "UPDATE sync_history SET status = 'PENDING_RETRY', failure_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(id)
    .execute(&pool)
    .await?;

    let updated_sh = sqlx::query_as::<_, SyncHistoryRow>(
        "SELECT id, payload, status, failure_reason, retries, \
         strftime('%Y-%m-%dT%H:%M:%fZ', created_at) as created_at, \
         strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) as updated_at \
         FROM sync_history WHERE id = ?",
    )
    .bind(id)
    .fetch_one(&pool)
    .await?;

    let body = json!({
        "status": 200,
        "message": "Sync history will be retried",
        "data": updated_sh
    });

    Ok((StatusCode::OK, Json(body)).into_response())
}

// --- DELETE /api/v1/sync-history/{id} ---
pub async fn delete_history_handler(
    State(pool): State<SqlitePool>,
    Path(id): Path<i64>,
) -> Result<Response, AppError> {
    let affected = sqlx::query("DELETE FROM sync_history WHERE id = ?")
        .bind(id)
        .execute(&pool)
        .await?
        .rows_affected();

    if affected == 0 {
        return Err(AppError::NotFound("Sync history not found".to_string()));
    }

    let body = json!({
        "status": 204,
        "message": "Sync history deleted successfully"
    });

    Ok((StatusCode::NO_CONTENT, Json(body)).into_response())
}
