from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "IMB API"
    app_env: str = "local"
    api_v1_prefix: str = "/api/v1"
    backend_cors_origins: str = "http://localhost:3000,http://localhost:5173"

    database_url: str = Field(default="", repr=False)
    supabase_url: str = ""
    supabase_service_role_key: str = Field(default="", repr=False)

    telegram_bot_token: str = Field(default="", repr=False)
    telegram_bot_username: str = ""

    ad_callback_secret: str = Field(default="", repr=False)
    download_session_ttl_minutes: int = 15

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.backend_cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
