import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Load local environment file if present
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))


class Settings(BaseSettings):
    PROJECT_NAME: str = "HealthEase"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    FRONTEND_ORIGIN: str = "http://localhost:3000,http://localhost:5173"

    # MongoDB settings (supports Atlas URI and local)
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "healthease"

    # JWT Authentication
    JWT_SECRET: str = "healthease_super_secure_jwt_secret_key_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ALGORITHM: str = "HS256"

    # Bootstrap Administrator
    ADMIN_NAME: str = "HealthEase Admin"
    ADMIN_EMAIL: str = "admin@healthease.com"
    ADMIN_PASSWORD: str = "Admin@HealthEase2026"

    # Redis (Caching & Rate Limiting)
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = True
    CACHE_TTL_SECONDS: int = 300

    # RabbitMQ (Background Notifications)
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"
    RABBITMQ_QUEUE: str = "healthease_notifications"

    # Medical AI Chatbot (Google Gemini)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    @property
    def cors_origins(self) -> List[str]:
        origins = [orig.strip() for orig in self.FRONTEND_ORIGIN.split(",") if orig.strip()]
        # Always allow common development ports
        for default in ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"]:
            if default not in origins:
                origins.append(default)
        return origins

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()
