// src/graphql/query.rs
use async_graphql::{Context, Object, Result};
use sqlx::SqlitePool;

use crate::graphql::schema::Employee;

pub struct Query;

#[Object]
impl Query {
    // hello query
    async fn hello(&self) -> &str {
        "Hello from Sync Bridge"
    }

    // employees paginated list
    async fn employees(
        &self,
        ctx: &Context<'_>,
        #[graphql(default = 0)] offset: i64,
        #[graphql(default = 10)] limit: i64,
    ) -> Result<Vec<Employee>> {
        let pool = ctx.data::<SqlitePool>()?;
        let safe_limit = if limit > 0 { limit } else { 10 };
        let safe_offset = offset.max(0);

        let list =
            sqlx::query_as::<_, Employee>("SELECT * FROM employees ORDER BY id LIMIT ? OFFSET ?")
                .bind(safe_limit)
                .bind(safe_offset)
                .fetch_all(pool)
                .await?;

        Ok(list)
    }

    // single employee details
    async fn employee(&self, ctx: &Context<'_>, id: i64) -> Result<Option<Employee>> {
        let pool = ctx.data::<SqlitePool>()?;

        let emp = sqlx::query_as::<_, Employee>("SELECT * FROM employees WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?;

        Ok(emp)
    }

    // search employees by first_name, last_name, or email
    async fn search_employees(
        &self,
        ctx: &Context<'_>,
        search: String,
        #[graphql(default = 0)] offset: i64,
        #[graphql(default = 10)] limit: i64,
    ) -> Result<Vec<Employee>> {
        let pool = ctx.data::<SqlitePool>()?;
        let safe_limit = if limit > 0 { limit } else { 10 };
        let safe_offset = offset.max(0);

        let search_pattern = format!("%{}%", search.to_lowercase());

        let list = sqlx::query_as::<_, Employee>(
            "SELECT * FROM employees WHERE \
             lower(first_name) LIKE ? OR \
             lower(last_name) LIKE ? OR \
             lower(email) LIKE ? \
             ORDER BY id LIMIT ? OFFSET ?",
        )
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(&search_pattern)
        .bind(safe_limit)
        .bind(safe_offset)
        .fetch_all(pool)
        .await?;

        Ok(list)
    }
}
