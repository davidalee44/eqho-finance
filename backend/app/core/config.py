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

    # Resend Email API
    RESEND_API_KEY: str = ""

    # Pipedream Connect Configuration
    PIPEDREAM_PROJECT_ID: str = ""
    PIPEDREAM_CLIENT_ID: str = ""
    PIPEDREAM_CLIENT_SECRET: str = ""
    PIPEDREAM_ENVIRONMENT: str = "production"
    PIPEDREAM_WORKSPACE_ID: str = ""
    PIPEDREAM_WEBHOOK_SECRET: str = ""

    # QuickBooks Configuration
    QUICKBOOKS_CLIENT_ID: str = ""
    QUICKBOOKS_CLIENT_SECRET: str = ""
    QUICKBOOKS_REDIRECT_URI: str = "http://localhost:8000/api/v1/quickbooks/auth/callback"
    QUICKBOOKS_REALM_ID: str = ""  # Your company ID from QuickBooks
    QUICKBOOKS_USE_SANDBOX: bool = False  # Set to True for sandbox/development

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Allow extra env vars without validation errors


settings = Settings()
