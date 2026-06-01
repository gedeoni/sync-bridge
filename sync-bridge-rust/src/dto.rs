// src/dto.rs
use crate::errors::AppError;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// --- Helper Functions for Validation ---
fn is_blank(s: &str) -> bool {
    s.trim().is_empty()
}

fn is_valid_email(s: &str) -> bool {
    // A simple robust email regex check or character check
    s.contains('@')
        && s.split('@')
            .nth(1)
            .is_some_and(|domain| domain.contains('.'))
}

// --- Sync Request ---
#[derive(Debug, Deserialize)]
pub struct SyncRequest {
    pub model: String,
    pub data: Vec<serde_json::Value>,
}

impl SyncRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        let mut errors = HashMap::new();
        if is_blank(&self.model) {
            errors.insert("model".to_string(), "must not be blank".to_string());
        } else if !["customers", "products", "orders", "employees"].contains(&self.model.as_str()) {
            errors.insert("model".to_string(), "Invalid model".to_string());
        }

        if self.data.is_empty() {
            errors.insert("data".to_string(), "must not be empty".to_string());
        }

        if !errors.is_empty() {
            return Err(AppError::Validation { errors });
        }
        Ok(())
    }
}

// --- Customer ---
#[derive(Debug, Deserialize, Serialize)]
pub struct CustomerDto {
    pub id: Option<i64>,
    pub email: String,
    #[serde(rename = "first_name")]
    pub first_name: String,
    #[serde(rename = "last_name")]
    pub last_name: String,
    #[serde(rename = "default_currency")]
    pub default_currency: Option<String>,
}

impl CustomerDto {
    pub fn validate(&self) -> Result<(), AppError> {
        let mut errors = HashMap::new();
        if is_blank(&self.email) {
            errors.insert("email".to_string(), "must not be blank".to_string());
        } else if !is_valid_email(&self.email) {
            errors.insert(
                "email".to_string(),
                "must be a well-formed email address".to_string(),
            );
        }

        if is_blank(&self.first_name) {
            errors.insert("first_name".to_string(), "must not be blank".to_string());
        }

        if is_blank(&self.last_name) {
            errors.insert("last_name".to_string(), "must not be blank".to_string());
        }

        if let Some(ref currency) = self.default_currency {
            if currency.len() != 3 {
                errors.insert("default_currency".to_string(), "size must be 3".to_string());
            }
        }

        if !errors.is_empty() {
            return Err(AppError::Validation { errors });
        }
        Ok(())
    }
}

// --- Product ---
#[derive(Debug, Deserialize, Serialize)]
pub struct ProductDto {
    pub id: Option<i64>,
    pub name: String,
    pub description: Option<String>,
    pub price: i32,
    pub currency: Option<String>,
    pub active: Option<bool>,
    #[serde(rename = "weight_grams")]
    pub weight_grams: Option<i32>,
}

impl ProductDto {
    pub fn validate(&self) -> Result<(), AppError> {
        let mut errors = HashMap::new();
        if is_blank(&self.name) {
            errors.insert("name".to_string(), "must not be blank".to_string());
        }

        if let Some(ref currency) = self.currency {
            if currency.len() != 3 {
                errors.insert("currency".to_string(), "size must be 3".to_string());
            }
        }

        if !errors.is_empty() {
            return Err(AppError::Validation { errors });
        }
        Ok(())
    }
}

// --- Order Item ---
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct OrderItemDto {
    pub id: Option<i64>,
    #[serde(rename = "product_id")]
    pub product_id: i64,
    pub qty: i32,
    #[serde(rename = "unit_price")]
    pub unit_price: i32,
}

impl OrderItemDto {
    pub fn validate(&self) -> Result<(), AppError> {
        let mut errors = HashMap::new();
        if self.product_id <= 0 {
            errors.insert("product_id".to_string(), "must be positive".to_string());
        }
        if self.qty <= 0 {
            errors.insert("qty".to_string(), "must be greater than 0".to_string());
        }
        if self.unit_price <= 0 {
            errors.insert("unit_price".to_string(), "must be positive".to_string());
        }

        if !errors.is_empty() {
            return Err(AppError::Validation { errors });
        }
        Ok(())
    }
}

// --- Order ---
#[derive(Debug, Deserialize, Serialize)]
pub struct OrderDto {
    pub id: Option<i64>,
    #[serde(rename = "order_number")]
    pub order_number: String,
    #[serde(rename = "customer_id")]
    pub customer_id: i64,
    pub status: String,
    pub currency: Option<String>,
    pub amount: Option<i32>,
    pub items: Option<Vec<OrderItemDto>>,
}

impl OrderDto {
    pub fn validate(&self) -> Result<(), AppError> {
        let mut errors = HashMap::new();
        if is_blank(&self.order_number) {
            errors.insert("order_number".to_string(), "must not be blank".to_string());
        }

        if self.customer_id <= 0 {
            errors.insert("customer_id".to_string(), "must be positive".to_string());
        }

        let valid_statuses = [
            "pending",
            "paid",
            "shipped",
            "completed",
            "cancelled",
            "refunded",
        ];
        if is_blank(&self.status) {
            errors.insert("status".to_string(), "must not be blank".to_string());
        } else if !valid_statuses.contains(&self.status.as_str()) {
            errors.insert(
                "status".to_string(),
                "must match pending|paid|shipped|completed|cancelled|refunded".to_string(),
            );
        }

        if let Some(ref currency) = self.currency {
            if currency.len() != 3 {
                errors.insert("currency".to_string(), "size must be 3".to_string());
            }
        }

        if !errors.is_empty() {
            return Err(AppError::Validation { errors });
        }
        Ok(())
    }
}

// --- Employee ---
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct EmployeeDto {
    pub id: String,
    #[serde(rename = "employeeId")]
    pub employee_id: String,
    #[serde(rename = "firstName")]
    pub first_name: String,
    #[serde(rename = "middleName")]
    pub middle_name: Option<String>,
    #[serde(rename = "lastName")]
    pub last_name: String,
    pub gender: Option<String>,
    pub email: String,
    #[serde(rename = "phoneNumber")]
    pub phone_number: Option<String>,
    #[serde(rename = "dateOfBirth")]
    pub date_of_birth: Option<DateTime<Utc>>,
    pub nationality: Option<String>,
    #[serde(rename = "jobLevel")]
    pub job_level: Option<String>,
    pub department: Option<String>,
    pub location: Option<String>,
    #[serde(rename = "bankAccountNumber")]
    pub bank_account_number: Option<String>,
    pub company: Option<String>,
    #[serde(rename = "jobTitle")]
    pub job_title: Option<String>,
    #[serde(rename = "costCenter")]
    pub cost_center: Option<String>,
    #[serde(rename = "startDate")]
    pub start_date: Option<DateTime<Utc>>,
    #[serde(rename = "employeeStatus")]
    pub employee_status: Option<String>,
    #[serde(rename = "managerId")]
    pub manager_id: Option<String>,
    #[serde(rename = "managerEmail")]
    pub manager_email: Option<String>,
    #[serde(rename = "lastModifiedOn")]
    pub last_modified_on: Option<DateTime<Utc>>,
    #[serde(rename = "lastModified")]
    pub last_modified: Option<i64>,
}

impl EmployeeDto {
    pub fn validate(&self) -> Result<(), AppError> {
        let mut errors = HashMap::new();
        if is_blank(&self.id) {
            errors.insert("id".to_string(), "must not be blank".to_string());
        }
        if is_blank(&self.employee_id) {
            errors.insert("employeeId".to_string(), "must not be blank".to_string());
        }
        if is_blank(&self.first_name) {
            errors.insert("firstName".to_string(), "must not be blank".to_string());
        }
        if is_blank(&self.last_name) {
            errors.insert("lastName".to_string(), "must not be blank".to_string());
        }
        if is_blank(&self.email) {
            errors.insert("email".to_string(), "must not be blank".to_string());
        } else if !is_valid_email(&self.email) {
            errors.insert(
                "email".to_string(),
                "must be a well-formed email address".to_string(),
            );
        }

        if let Some(ref m_email) = self.manager_email {
            if !is_blank(m_email) && !is_valid_email(m_email) {
                errors.insert(
                    "managerEmail".to_string(),
                    "must be a well-formed email address".to_string(),
                );
            }
        }

        if !errors.is_empty() {
            return Err(AppError::Validation { errors });
        }
        Ok(())
    }
}
