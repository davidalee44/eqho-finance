from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Eqho Due Diligence API"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative port
        "https://eqho-due-diligence.vercel.app",  # Production (update as needed)
    ]

    # Stripe Configuration
    STRIPE_SECRET_KEY: str = ""  # Required for production, optional for dev
    STRIPE_PUBLISHABLE_KEY: str = ""

    # TowPilot Tag
    TOWPILOT_TAG: str = "tow"

    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""

    # Cache Configuration
    CACHE_TTL: int = 300  # 5 minutes default

    # Pipedream Configuration
    PIPEDREAM_CONNECT_TOKEN: str = ""
    PIPEDREAM_PROJECT_ID: str = ""
    PIPEDREAM_ENVIRONMENT: str = "production"
    PIPEDREAM_WEBHOOK_SECRET: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
