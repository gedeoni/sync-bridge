from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_port: int = 3000
    authorization_key: str = "your-secret-auth-key"
    database_url: str = "sqlite+aiosqlite:///:memory:"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
