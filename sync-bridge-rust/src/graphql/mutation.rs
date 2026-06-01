// src/graphql/mutation.rs
use async_graphql::{Context, ErrorExtensions, Object, Result};
use sqlx::SqlitePool;
use tokio::sync::broadcast::Sender;

use crate::errors::handle_db_error;
use crate::graphql::schema::{CreateEmployeeInput, Employee, UpdateEmployeeInput};

pub struct Mutation;

#[Object]
impl Mutation {
    // create employee and emit to subscription channel
    async fn create_employee(
        &self,
        ctx: &Context<'_>,
        data: CreateEmployeeInput,
    ) -> Result<Employee> {
        let pool = ctx.data::<SqlitePool>()?;
        let broadcast_tx = ctx.data::<Sender<Employee>>()?;

        sqlx::query(
            "INSERT INTO employees ( \
               id, employee_id, first_name, middle_name, last_name, email, company, job_title \
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(data.id)
        .bind(&data.employee_id)
        .bind(&data.first_name)
        .bind(&data.middle_name)
        .bind(&data.last_name)
        .bind(&data.email)
        .bind(&data.company)
        .bind(&data.job_title)
        .execute(pool)
        .await
        .map_err(|e| handle_db_error(e).extend())?;

        let employee = sqlx::query_as::<_, Employee>("SELECT * FROM employees WHERE id = ?")
            .bind(data.id)
            .fetch_one(pool)
            .await?;

        // Emit to subscriptions
        let _ = broadcast_tx.send(employee.clone());

        Ok(employee)
    }

    // update employee
    async fn update_employee(
        &self,
        ctx: &Context<'_>,
        id: i64,
        data: UpdateEmployeeInput,
    ) -> Result<Option<Employee>> {
        let pool = ctx.data::<SqlitePool>()?;

        // Fetch existing employee
        let existing = sqlx::query_as::<_, Employee>("SELECT * FROM employees WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;

        let mut emp = match existing {
            Some(e) => e,
            None => return Ok(None),
        };

        // Merge input changes
        if let Some(first_name) = data.first_name {
            emp.first_name = first_name;
        }
        if let Some(last_name) = data.last_name {
            emp.last_name = last_name;
        }
        if let Some(email) = data.email {
            emp.email = email;
        }
        if data.middle_name.is_some() {
            emp.middle_name = data.middle_name;
        }
        if data.company.is_some() {
            emp.company = data.company;
        }
        if data.job_title.is_some() {
            emp.job_title = data.job_title;
        }

        // Save back
        sqlx::query(
            "UPDATE employees SET \
               first_name = ?, \
               last_name = ?, \
               email = ?, \
               middle_name = ?, \
               company = ?, \
               job_title = ? \
             WHERE id = ?",
        )
        .bind(&emp.first_name)
        .bind(&emp.last_name)
        .bind(&emp.email)
        .bind(&emp.middle_name)
        .bind(&emp.company)
        .bind(&emp.job_title)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| handle_db_error(e).extend())?;

        let updated = sqlx::query_as::<_, Employee>("SELECT * FROM employees WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;

        Ok(updated)
    }

    // delete employee
    async fn delete_employee(&self, ctx: &Context<'_>, id: i64) -> Result<bool> {
        let pool = ctx.data::<SqlitePool>()?;

        let affected = sqlx::query("DELETE FROM employees WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?
            .rows_affected();

        Ok(affected > 0)
    }
}
