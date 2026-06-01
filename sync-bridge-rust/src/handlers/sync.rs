// src/handlers/sync.rs
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde_json::{json, Value};
use sqlx::{Sqlite, SqlitePool, Transaction};
use std::time::Instant;
use tracing::error;

use crate::dto::{CustomerDto, EmployeeDto, OrderDto, ProductDto, SyncRequest};
use crate::errors::{handle_db_error, AppError};
use crate::metrics::{SYNC_DURATION, SYNC_ERRORS, SYNC_TOTAL};

pub async fn sync_handler(
    State(pool): State<SqlitePool>,
    Json(payload): Json<SyncRequest>,
) -> Result<impl IntoResponse, AppError> {
    let start_time = Instant::now();
    let model = payload.model.clone();

    // 1. Validate request model and non-empty data
    payload.validate()?;

    // 2. Serialize payload data to store in history
    let payload_str = serde_json::to_string(&payload.data)
        .unwrap_or_else(|_| "Error serializing payload".to_string());

    // 3. Create sync_history entry with PENDING_RETRY (committed immediately)
    let sync_history_id = create_pending_history(&pool, &payload_str).await?;

    // 4. Begin transaction
    let mut tx = match pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            let app_err = AppError::Internal(e);
            mark_history_failed(&pool, sync_history_id, &app_err.to_string()).await;
            return Err(app_err);
        }
    };

    let mut results = Vec::new();

    // 5. Process items
    let mut process_result = Ok(());
    for item_val in &payload.data {
        match process_item(&mut tx, &model, item_val).await {
            Ok(res) => results.push(res),
            Err(err) => {
                process_result = Err(err);
                break;
            }
        }
    }

    // 6. Handle outcome
    let elapsed = start_time.elapsed().as_secs_f64();
    match process_result {
        Ok(()) => {
            // Commit transaction
            if let Err(e) = tx.commit().await {
                let db_err = handle_db_error(e);
                mark_history_failed(&pool, sync_history_id, &db_err.to_string()).await;

                // Track failure metrics
                SYNC_TOTAL.with_label_values(&["error", &model]).inc();
                SYNC_ERRORS
                    .with_label_values(&["SqliteException", &model])
                    .inc();
                SYNC_DURATION
                    .with_label_values(&["error", &model])
                    .observe(elapsed);

                return Err(db_err);
            }

            // Mark history successful
            let _ = sqlx::query("UPDATE sync_history SET status = 'SUCCESSFUL', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(sync_history_id)
                .execute(&pool)
                .await;

            // Track success metrics
            SYNC_TOTAL.with_label_values(&["success", &model]).inc();
            SYNC_DURATION
                .with_label_values(&["success", &model])
                .observe(elapsed);

            let body = json!({
                "status": 200,
                "message": "Sync completed successfully",
                "data": {
                    "results": results
                }
            });
            Ok((StatusCode::OK, Json(body)).into_response())
        }
        Err(err) => {
            // Rollback is automatic on drop, but let's log the error
            error!("Sync processing failed for model {}: {}", model, err);

            // Explicitly drop transaction to release SQLite database write locks
            std::mem::drop(tx);

            // Mark history as failed
            let err_msg = err.to_string();
            mark_history_failed(&pool, sync_history_id, &err_msg).await;

            // Track failure metrics
            let err_class = match &err {
                AppError::Validation { .. } => "ValidationException",
                AppError::Conflict(_) => "DataIntegrityViolationException",
                AppError::BadRequest(_) => "ApiException",
                _ => "InternalServerError",
            };
            SYNC_TOTAL.with_label_values(&["error", &model]).inc();
            SYNC_ERRORS.with_label_values(&[err_class, &model]).inc();
            SYNC_DURATION
                .with_label_values(&["error", &model])
                .observe(elapsed);

            Err(err)
        }
    }
}

// --- Helper Functions to Manage History ---
async fn create_pending_history(pool: &SqlitePool, payload: &str) -> Result<i64, AppError> {
    let res = sqlx::query(
        "INSERT INTO sync_history (payload, status, retries, created_at, updated_at) VALUES (?, 'PENDING_RETRY', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
    )
    .bind(payload)
    .execute(pool)
    .await?;

    Ok(res.last_insert_rowid())
}

async fn mark_history_failed(pool: &SqlitePool, id: i64, reason: &str) {
    let truncated_reason = if reason.len() > 255 {
        &reason[0..255]
    } else {
        reason
    };

    let _ = sqlx::query(
        "UPDATE sync_history SET status = 'FAILED', failure_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(truncated_reason)
    .bind(id)
    .execute(pool)
    .await;
}

// --- Process Individual Item ---
async fn process_item(
    tx: &mut Transaction<'_, Sqlite>,
    model: &str,
    item_val: &Value,
) -> Result<Value, AppError> {
    match model {
        "customers" => {
            let dto: CustomerDto = serde_json::from_value(item_val.clone())?;
            dto.validate()?;

            let id_opt = dto.id;
            let status = if id_opt.is_some() {
                "updated"
            } else {
                "created"
            };

            let saved_id = if let Some(id) = id_opt {
                sqlx::query(
                    "INSERT INTO customers (id, email, first_name, last_name, default_currency, updated_at) \
                     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP) \
                     ON CONFLICT(id) DO UPDATE SET \
                       email = excluded.email, \
                       first_name = excluded.first_name, \
                       last_name = excluded.last_name, \
                       default_currency = excluded.default_currency, \
                       updated_at = CURRENT_TIMESTAMP"
                )
                .bind(id)
                .bind(&dto.email)
                .bind(&dto.first_name)
                .bind(&dto.last_name)
                .bind(dto.default_currency.as_deref().unwrap_or("USD"))
                .execute(&mut **tx)
                .await
                .map_err(handle_db_error)?;
                id
            } else {
                let res = sqlx::query(
                    "INSERT INTO customers (email, first_name, last_name, default_currency, created_at, updated_at) \
                     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                )
                .bind(&dto.email)
                .bind(&dto.first_name)
                .bind(&dto.last_name)
                .bind(dto.default_currency.as_deref().unwrap_or("USD"))
                .execute(&mut **tx)
                .await
                .map_err(handle_db_error)?;
                res.last_insert_rowid()
            };

            Ok(json!({ "id": saved_id, "status": status }))
        }
        "products" => {
            let dto: ProductDto = serde_json::from_value(item_val.clone())?;
            dto.validate()?;

            let id_opt = dto.id;
            let status = if id_opt.is_some() {
                "updated"
            } else {
                "created"
            };
            let active_val = if dto.active.unwrap_or(true) { 1 } else { 0 };

            let saved_id = if let Some(id) = id_opt {
                sqlx::query(
                    "INSERT INTO products (id, name, description, price, currency, active, weight_grams, updated_at) \
                     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) \
                     ON CONFLICT(id) DO UPDATE SET \
                       name = excluded.name, \
                       description = excluded.description, \
                       price = excluded.price, \
                       currency = excluded.currency, \
                       active = excluded.active, \
                       weight_grams = excluded.weight_grams, \
                       updated_at = CURRENT_TIMESTAMP"
                )
                .bind(id)
                .bind(&dto.name)
                .bind(&dto.description)
                .bind(dto.price)
                .bind(dto.currency.as_deref().unwrap_or("USD"))
                .bind(active_val)
                .bind(dto.weight_grams)
                .execute(&mut **tx)
                .await
                .map_err(handle_db_error)?;
                id
            } else {
                let res = sqlx::query(
                    "INSERT INTO products (name, description, price, currency, active, weight_grams, created_at, updated_at) \
                     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                )
                .bind(&dto.name)
                .bind(&dto.description)
                .bind(dto.price)
                .bind(dto.currency.as_deref().unwrap_or("USD"))
                .bind(active_val)
                .bind(dto.weight_grams)
                .execute(&mut **tx)
                .await
                .map_err(handle_db_error)?;
                res.last_insert_rowid()
            };

            Ok(json!({ "id": saved_id, "status": status }))
        }
        "orders" => {
            let dto: OrderDto = serde_json::from_value(item_val.clone())?;
            dto.validate()?;

            // Validate and calculate amount
            let calculated_amount = if let Some(ref items) = dto.items {
                if items.is_empty() {
                    return Err(AppError::BadRequest(
                        "Order must include items or an amount".to_string(),
                    ));
                }

                let mut sum = 0;
                for it in items {
                    it.validate()?;
                    sum += it.qty * it.unit_price;
                }

                if let Some(provided) = dto.amount {
                    if provided != sum {
                        return Err(AppError::BadRequest(format!(
                            "Order amount must equal the sum of item prices (qty * unit_price). Calculated={} provided={}",
                            sum, provided
                        )));
                    }
                }
                sum
            } else {
                dto.amount.ok_or_else(|| {
                    AppError::BadRequest("Order must include items or an amount".to_string())
                })?
            };

            let id_opt = dto.id;
            let status = if id_opt.is_some() {
                "updated"
            } else {
                "created"
            };

            let saved_id = if let Some(id) = id_opt {
                sqlx::query(
                    "INSERT INTO orders (id, order_number, customer_id, status, currency, amount, updated_at) \
                     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) \
                     ON CONFLICT(id) DO UPDATE SET \
                       order_number = excluded.order_number, \
                       customer_id = excluded.customer_id, \
                       status = excluded.status, \
                       currency = excluded.currency, \
                       amount = excluded.amount, \
                       updated_at = CURRENT_TIMESTAMP"
                )
                .bind(id)
                .bind(&dto.order_number)
                .bind(dto.customer_id)
                .bind(&dto.status)
                .bind(dto.currency.as_deref().unwrap_or("USD"))
                .bind(calculated_amount)
                .execute(&mut **tx)
                .await
                .map_err(handle_db_error)?;
                id
            } else {
                let res = sqlx::query(
                    "INSERT INTO orders (order_number, customer_id, status, currency, amount, placed_at, updated_at) \
                     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
                )
                .bind(&dto.order_number)
                .bind(dto.customer_id)
                .bind(&dto.status)
                .bind(dto.currency.as_deref().unwrap_or("USD"))
                .bind(calculated_amount)
                .execute(&mut **tx)
                .await
                .map_err(handle_db_error)?;
                res.last_insert_rowid()
            };

            // If items are provided, replace them cascade-style
            if let Some(ref items) = dto.items {
                // Delete existing items first
                sqlx::query("DELETE FROM order_items WHERE order_id = ?")
                    .bind(saved_id)
                    .execute(&mut **tx)
                    .await
                    .map_err(handle_db_error)?;

                // Insert new ones
                for it in items {
                    sqlx::query(
                        "INSERT INTO order_items (order_id, product_id, qty, unit_price) VALUES (?, ?, ?, ?)"
                    )
                    .bind(saved_id)
                    .bind(it.product_id)
                    .bind(it.qty)
                    .bind(it.unit_price)
                    .execute(&mut **tx)
                    .await
                    .map_err(handle_db_error)?;
                }
            }

            Ok(json!({ "id": saved_id, "status": status }))
        }
        "employees" => {
            let dto: EmployeeDto = serde_json::from_value(item_val.clone())?;
            dto.validate()?;

            // Map string ID to long i64. If not a valid integer, we create a new one (or ignore) matching Java
            let parsed_id: Option<i64> = dto.id.parse().ok();

            let status = if parsed_id.is_some() {
                "updated"
            } else {
                "created"
            };

            let saved_id = if let Some(id) = parsed_id {
                sqlx::query(
                    "INSERT INTO employees ( \
                       id, employee_id, first_name, middle_name, last_name, gender, email, phone_number, \
                       date_of_birth, nationality, job_level, department, location, bank_account_number, \
                       company, job_title, cost_center, start_date, employee_status, manager_id, manager_email, \
                       last_modified_on, last_modified \
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) \
                     ON CONFLICT(id) DO UPDATE SET \
                       employee_id = excluded.employee_id, \
                       first_name = excluded.first_name, \
                       middle_name = excluded.middle_name, \
                       last_name = excluded.last_name, \
                       gender = excluded.gender, \
                       email = excluded.email, \
                       phone_number = excluded.phone_number, \
                       date_of_birth = excluded.date_of_birth, \
                       nationality = excluded.nationality, \
                       job_level = excluded.job_level, \
                       department = excluded.department, \
                       location = excluded.location, \
                       bank_account_number = excluded.bank_account_number, \
                       company = excluded.company, \
                       job_title = excluded.job_title, \
                       cost_center = excluded.cost_center, \
                       start_date = excluded.start_date, \
                       employee_status = excluded.employee_status, \
                       manager_id = excluded.manager_id, \
                       manager_email = excluded.manager_email, \
                       last_modified_on = excluded.last_modified_on, \
                       last_modified = excluded.last_modified"
                )
                .bind(id)
                .bind(&dto.employee_id)
                .bind(&dto.first_name)
                .bind(&dto.middle_name)
                .bind(&dto.last_name)
                .bind(&dto.gender)
                .bind(&dto.email)
                .bind(&dto.phone_number)
                .bind(dto.date_of_birth)
                .bind(&dto.nationality)
                .bind(&dto.job_level)
                .bind(&dto.department)
                .bind(&dto.location)
                .bind(&dto.bank_account_number)
                .bind(&dto.company)
                .bind(&dto.job_title)
                .bind(&dto.cost_center)
                .bind(dto.start_date)
                .bind(&dto.employee_status)
                .bind(&dto.manager_id)
                .bind(&dto.manager_email)
                .bind(dto.last_modified_on)
                .bind(dto.last_modified)
                .execute(&mut **tx)
                .await
                .map_err(handle_db_error)?;
                id
            } else {
                // Generate a random positive i64 id if not provided
                let rand_id = (uuid::Uuid::new_v4().as_u128() & 0x7fffffffffffffff) as i64;
                sqlx::query(
                    "INSERT INTO employees ( \
                       id, employee_id, first_name, middle_name, last_name, gender, email, phone_number, \
                       date_of_birth, nationality, job_level, department, location, bank_account_number, \
                       company, job_title, cost_center, start_date, employee_status, manager_id, manager_email, \
                       last_modified_on, last_modified \
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(rand_id)
                .bind(&dto.employee_id)
                .bind(&dto.first_name)
                .bind(&dto.middle_name)
                .bind(&dto.last_name)
                .bind(&dto.gender)
                .bind(&dto.email)
                .bind(&dto.phone_number)
                .bind(dto.date_of_birth)
                .bind(&dto.nationality)
                .bind(&dto.job_level)
                .bind(&dto.department)
                .bind(&dto.location)
                .bind(&dto.bank_account_number)
                .bind(&dto.company)
                .bind(&dto.job_title)
                .bind(&dto.cost_center)
                .bind(dto.start_date)
                .bind(&dto.employee_status)
                .bind(&dto.manager_id)
                .bind(&dto.manager_email)
                .bind(dto.last_modified_on)
                .bind(dto.last_modified)
                .execute(&mut **tx)
                .await
                .map_err(handle_db_error)?;
                rand_id
            };

            Ok(json!({ "id": saved_id, "status": status }))
        }
        _ => Err(AppError::BadRequest(format!("Invalid model: {}", model))),
    }
}
