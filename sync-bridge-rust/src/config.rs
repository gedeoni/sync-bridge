// src/config.rs
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub auth_token: String,
    pub database_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        let port = env::var("APP_PORT")
            .or_else(|_| env::var("PORT"))
            .ok()
            .and_then(|s| s.parse::<u16>().ok())
            .unwrap_or(3000);

        let auth_token = env::var("AUTHORIZATION_KEY")
            .or_else(|_| env::var("APP_AUTH_TOKEN"))
            .unwrap_or_else(|_| "your-secret-auth-key".to_string());

        let database_url =
            env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite::memory:?cache=shared".to_string());

        Self {
            port,
            auth_token,
            database_url,
        }
    }
}
