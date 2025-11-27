"""
Environment Variable Validator

Validates required environment variables at startup and build time.
Provides clear error messages to catch configuration issues early.

Usage:
- Import and call validate_env() at application startup
- Run `python -m app.core.env_validator` to check manually
"""

import os
import sys
from dataclasses import dataclass
from typing import Optional


@dataclass
class EnvVar:
    """Environment variable definition"""
    name: str
    required: bool = True
    description: str = ""
    secret: bool = False  # Don't log value if True
    default: Optional[str] = None


# Define all required environment variables
BACKEND_ENV_VARS = [
    # Supabase (required)
    EnvVar("SUPABASE_URL", required=True, description="Supabase project URL"),
    EnvVar("SUPABASE_ANON_KEY", required=True, secret=True, description="Supabase anonymous key"),

    # Stripe (required for metrics)
    EnvVar("STRIPE_SECRET_KEY", required=True, secret=True, description="Stripe API secret key"),

    # CORS (required for frontend)
    EnvVar("CORS_ORIGINS", required=True, description="Allowed CORS origins (comma-separated)"),

    # Pipedream Connect (optional but recommended for QuickBooks)
    EnvVar("PIPEDREAM_PROJECT_ID", required=False, description="Pipedream Connect project ID"),
    EnvVar("PIPEDREAM_CLIENT_ID", required=False, description="Pipedream OAuth client ID"),
    EnvVar("PIPEDREAM_CLIENT_SECRET", required=False, secret=True, description="Pipedream OAuth client secret"),
    EnvVar("PIPEDREAM_WORKSPACE_ID", required=False, description="Pipedream workspace ID"),
    EnvVar("PIPEDREAM_ENVIRONMENT", required=False, default="production", description="Pipedream environment"),

    # QuickBooks Direct OAuth (optional, alternative to Pipedream)
    EnvVar("QUICKBOOKS_CLIENT_ID", required=False, description="QuickBooks OAuth client ID"),
    EnvVar("QUICKBOOKS_CLIENT_SECRET", required=False, secret=True, description="QuickBooks OAuth client secret"),
    EnvVar("QUICKBOOKS_REALM_ID", required=False, description="QuickBooks company/realm ID"),

    # Email (optional)
    EnvVar("RESEND_API_KEY", required=False, secret=True, description="Resend email API key"),
]


def validate_env(raise_on_error: bool = True, verbose: bool = False) -> dict:
    """
    Validate environment variables.
    
    Args:
        raise_on_error: If True, raise exception on missing required vars
        verbose: If True, print status of all vars
        
    Returns:
        Dict with validation results:
        {
            'valid': bool,
            'missing_required': List[str],
            'missing_optional': List[str],
            'configured': List[str],
            'warnings': List[str],
        }
    """
    # Load .env file if present (for development)
    try:
        from pathlib import Path

        from dotenv import load_dotenv

        # Try multiple locations for .env file
        env_paths = [
            Path(__file__).parent.parent.parent / ".env",  # backend/.env
            Path.cwd() / ".env",  # current directory
            Path.cwd() / "backend" / ".env",  # from project root
        ]

        for env_path in env_paths:
            if env_path.exists():
                load_dotenv(env_path)
                break
    except ImportError:
        pass  # dotenv not required in production

    missing_required = []
    missing_optional = []
    configured = []
    warnings = []

    for var in BACKEND_ENV_VARS:
        value = os.environ.get(var.name, var.default)

        if value:
            configured.append(var.name)
            if verbose:
                display_value = "***" if var.secret else (value[:20] + "..." if len(value) > 20 else value)
                print(f"  ✓ {var.name}: {display_value}")
        else:
            if var.required:
                missing_required.append(var.name)
                if verbose:
                    print(f"  ✗ {var.name}: MISSING (required) - {var.description}")
            else:
                missing_optional.append(var.name)
                if verbose:
                    print(f"  ○ {var.name}: not set (optional) - {var.description}")

    # Check for integration-specific warnings
    pipedream_vars = ["PIPEDREAM_PROJECT_ID", "PIPEDREAM_CLIENT_ID", "PIPEDREAM_CLIENT_SECRET"]
    pipedream_configured = all(os.environ.get(v) for v in pipedream_vars)

    qb_vars = ["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET"]
    qb_configured = all(os.environ.get(v) for v in qb_vars)

    if not pipedream_configured and not qb_configured:
        warnings.append(
            "Neither Pipedream nor QuickBooks direct OAuth is configured. "
            "QuickBooks integration will not be available."
        )

    result = {
        'valid': len(missing_required) == 0,
        'missing_required': missing_required,
        'missing_optional': missing_optional,
        'configured': configured,
        'warnings': warnings,
    }

    if raise_on_error and missing_required:
        error_msg = f"Missing required environment variables: {', '.join(missing_required)}"
        raise OSError(error_msg)

    return result


def print_validation_report(result: dict) -> None:
    """Print a formatted validation report"""
    print("\n" + "=" * 60)
    print("Environment Variable Validation Report")
    print("=" * 60)

    if result['valid']:
        print("\n✅ All required environment variables are configured")
    else:
        print("\n❌ Missing required environment variables:")
        for var in result['missing_required']:
            var_info = next((v for v in BACKEND_ENV_VARS if v.name == var), None)
            desc = f" - {var_info.description}" if var_info else ""
            print(f"   • {var}{desc}")

    if result['missing_optional']:
        print("\n⚠️  Missing optional environment variables:")
        for var in result['missing_optional']:
            var_info = next((v for v in BACKEND_ENV_VARS if v.name == var), None)
            desc = f" - {var_info.description}" if var_info else ""
            print(f"   • {var}{desc}")

    if result['warnings']:
        print("\n⚠️  Warnings:")
        for warning in result['warnings']:
            print(f"   • {warning}")

    print("\n" + "-" * 60)
    print(f"Configured: {len(result['configured'])} | Missing Required: {len(result['missing_required'])} | Missing Optional: {len(result['missing_optional'])}")
    print("=" * 60 + "\n")


def validate_env_for_ci() -> int:
    """
    Validate environment for CI/CD.
    Returns exit code (0 for success, 1 for failure).
    """
    print("\n🔍 Validating environment variables for CI/CD build...")

    result = validate_env(raise_on_error=False, verbose=True)
    print_validation_report(result)

    if not result['valid']:
        print("❌ Build cannot proceed - fix missing required environment variables")
        return 1

    if result['warnings']:
        print("⚠️  Build will proceed with warnings")

    print("✅ Environment validation passed")
    return 0


if __name__ == "__main__":
    # Load .env file if it exists
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    sys.exit(validate_env_for_ci())

