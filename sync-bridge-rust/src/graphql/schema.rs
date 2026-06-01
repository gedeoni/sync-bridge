// src/graphql/schema.rs
use async_graphql::InputObject;
use chrono::{DateTime, Utc};
use sqlx::FromRow;

#[derive(Clone, FromRow)]
pub struct Employee {
    pub id: i64,
    pub employee_id: String,
    pub first_name: String,
    pub middle_name: Option<String>,
    pub last_name: String,
    pub gender: Option<String>,
    pub email: String,
    pub phone_number: Option<String>,
    pub date_of_birth: Option<DateTime<Utc>>,
    pub nationality: Option<String>,
    pub job_level: Option<String>,
    pub department: Option<String>,
    pub location: Option<String>,
    pub bank_account_number: Option<String>,
    pub company: Option<String>,
    pub job_title: Option<String>,
    pub cost_center: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub employee_status: Option<String>,
    pub manager_id: Option<String>,
    pub manager_email: Option<String>,
    pub last_modified_on: Option<DateTime<Utc>>,
    pub last_modified: Option<i64>,
}

#[async_graphql::Object]
impl Employee {
    async fn id(&self) -> i64 {
        self.id
    }
    async fn employee_id(&self) -> &str {
        &self.employee_id
    }
    async fn first_name(&self) -> &str {
        &self.first_name
    }
    async fn middle_name(&self) -> Option<&str> {
        self.middle_name.as_deref()
    }
    async fn last_name(&self) -> &str {
        &self.last_name
    }
    async fn gender(&self) -> Option<&str> {
        self.gender.as_deref()
    }
    async fn email(&self) -> &str {
        &self.email
    }
    async fn phone_number(&self) -> Option<&str> {
        self.phone_number.as_deref()
    }
    async fn date_of_birth(&self) -> Option<DateTime<Utc>> {
        self.date_of_birth
    }
    async fn nationality(&self) -> Option<&str> {
        self.nationality.as_deref()
    }
    async fn job_level(&self) -> Option<&str> {
        self.job_level.as_deref()
    }
    async fn department(&self) -> Option<&str> {
        self.department.as_deref()
    }
    async fn location(&self) -> Option<&str> {
        self.location.as_deref()
    }
    async fn bank_account_number(&self) -> Option<&str> {
        self.bank_account_number.as_deref()
    }
    async fn company(&self) -> Option<&str> {
        self.company.as_deref()
    }
    async fn job_title(&self) -> Option<&str> {
        self.job_title.as_deref()
    }
    async fn cost_center(&self) -> Option<&str> {
        self.cost_center.as_deref()
    }
    async fn start_date(&self) -> Option<DateTime<Utc>> {
        self.start_date
    }
    async fn employee_status(&self) -> Option<&str> {
        self.employee_status.as_deref()
    }
    async fn manager_id(&self) -> Option<&str> {
        self.manager_id.as_deref()
    }
    async fn manager_email(&self) -> Option<&str> {
        self.manager_email.as_deref()
    }
    async fn last_modified_on(&self) -> Option<DateTime<Utc>> {
        self.last_modified_on
    }
    async fn last_modified(&self) -> Option<i64> {
        self.last_modified
    }

    // Dynamic resolver matching @SchemaMapping in Java
    async fn full_name(&self) -> String {
        let mut builder = Vec::new();
        if !self.first_name.trim().is_empty() {
            builder.push(self.first_name.as_str());
        }
        if let Some(ref mid) = self.middle_name {
            if !mid.trim().is_empty() {
                builder.push(mid.as_str());
            }
        }
        if !self.last_name.trim().is_empty() {
            builder.push(self.last_name.as_str());
        }
        builder.join(" ")
    }
}

#[derive(InputObject)]
pub struct CreateEmployeeInput {
    pub id: i64,
    #[graphql(name = "employeeId")]
    pub employee_id: String,
    #[graphql(name = "firstName")]
    pub first_name: String,
    #[graphql(name = "lastName")]
    pub last_name: String,
    pub email: String,
    #[graphql(name = "middleName")]
    pub middle_name: Option<String>,
    pub company: Option<String>,
    #[graphql(name = "jobTitle")]
    pub job_title: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateEmployeeInput {
    #[graphql(name = "firstName")]
    pub first_name: Option<String>,
    #[graphql(name = "lastName")]
    pub last_name: Option<String>,
    pub email: Option<String>,
    #[graphql(name = "middleName")]
    pub middle_name: Option<String>,
    pub company: Option<String>,
    #[graphql(name = "jobTitle")]
    pub job_title: Option<String>,
}
