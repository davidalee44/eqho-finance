#!/usr/bin/env python3
"""
Environment Variable Validator

Validates required environment variables are set before application startup.
Run this during build/deploy to catch configuration issues early.

Usage:
    python scripts/validate_env.py          # Validate all
    python scripts/validate_env.py --strict # Fail on warnings too
    python scripts/validate_env.py --ci     # CI mode (non-interactive)
"""

import os
import sys
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional


class Severity(Enum):
    REQUIRED = "required"      # Build fails without this
    RECOMMENDED = "recommended"  # Warning only, build continues
    OPTIONAL = "optional"       # Info only


@dataclass
class EnvVar:
    name: str
    severity: Severity
    description: str
    default: Optional[str] = None
    validate_fn: Optional[callable] = None


# Environment variable definitions
ENV_VARS: List[EnvVar] = [
    # Core Supabase (Required)
    EnvVar(
        name="SUPABASE_URL",
        severity=Severity.REQUIRED,
        description="Supabase project URL",
    ),
    EnvVar(
        name="SUPABASE_ANON_KEY",
        severity=Severity.REQUIRED,
        description="Supabase anonymous/public key",
    ),
    
    # Stripe (Required for payment features)
    EnvVar(
        name="STRIPE_SECRET_KEY",
        severity=Severity.REQUIRED,
        description="Stripe secret API key",
        validate_fn=lambda v: v.startswith("sk_"),
    ),
    
    # CORS (Required for API access)
    EnvVar(
        name="CORS_ORIGINS",
        severity=Severity.REQUIRED,
        description="Allowed CORS origins (comma-separated)",
        default="http://localhost:5173",
    ),
    
    # Pipedream Connect (Recommended for integrations)
    EnvVar(
        name="PIPEDREAM_PROJECT_ID",
        severity=Severity.RECOMMENDED,
        description="Pipedream Connect project ID",
    ),
    EnvVar(
        name="PIPEDREAM_CLIENT_ID",
        severity=Severity.RECOMMENDED,
        description="Pipedream OAuth client ID",
    ),
    EnvVar(
        name="PIPEDREAM_CLIENT_SECRET",
        severity=Severity.RECOMMENDED,
        description="Pipedream OAuth client secret",
    ),
    EnvVar(
        name="PIPEDREAM_WORKSPACE_ID",
        severity=Severity.OPTIONAL,
        description="Pipedream workspace ID",
    ),
    EnvVar(
        name="PIPEDREAM_ENVIRONMENT",
        severity=Severity.OPTIONAL,
        description="Pipedream environment (production/development)",
        default="production",
    ),
    
    # QuickBooks Direct OAuth (Optional - Pipedream preferred)
    EnvVar(
        name="QUICKBOOKS_CLIENT_ID",
        severity=Severity.OPTIONAL,
        description="QuickBooks OAuth client ID (if not using Pipedream)",
    ),
    EnvVar(
        name="QUICKBOOKS_CLIENT_SECRET",
        severity=Severity.OPTIONAL,
        description="QuickBooks OAuth client secret",
    ),
    EnvVar(
        name="QUICKBOOKS_REALM_ID",
        severity=Severity.OPTIONAL,
        description="QuickBooks company/realm ID",
    ),
    
    # Email (Optional)
    EnvVar(
        name="RESEND_API_KEY",
        severity=Severity.OPTIONAL,
        description="Resend API key for transactional emails",
    ),
]


class Colors:
    """ANSI color codes for terminal output"""
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"
    BOLD = "\033[1m"


def colorize(text: str, color: str, use_color: bool = True) -> str:
    """Apply ANSI color to text"""
    if not use_color:
        return text
    return f"{color}{text}{Colors.RESET}"


def validate_env_vars(strict: bool = False, ci_mode: bool = False) -> bool:
    """
    Validate all environment variables.
    
    Args:
        strict: If True, treat warnings as errors
        ci_mode: If True, use CI-friendly output (no colors)
    
    Returns:
        True if validation passed, False otherwise
    """
    use_color = not ci_mode and sys.stdout.isatty()
    
    errors: List[str] = []
    warnings: List[str] = []
    info: List[str] = []
    
    print(colorize("\n🔍 Validating Environment Variables\n", Colors.BOLD, use_color))
    print("=" * 60)
    
    for var in ENV_VARS:
        value = os.environ.get(var.name, var.default)
        
        # Check if set
        if not value:
            if var.severity == Severity.REQUIRED:
                errors.append(f"{var.name}: {var.description}")
                status = colorize("✗ MISSING", Colors.RED, use_color)
            elif var.severity == Severity.RECOMMENDED:
                warnings.append(f"{var.name}: {var.description}")
                status = colorize("⚠ NOT SET", Colors.YELLOW, use_color)
            else:
                info.append(f"{var.name}: {var.description}")
                status = colorize("○ NOT SET", Colors.BLUE, use_color)
        else:
            # Validate value if validator provided
            if var.validate_fn:
                try:
                    if not var.validate_fn(value):
                        errors.append(f"{var.name}: Invalid format - {var.description}")
                        status = colorize("✗ INVALID", Colors.RED, use_color)
                    else:
                        status = colorize("✓ OK", Colors.GREEN, use_color)
                except Exception as e:
                    errors.append(f"{var.name}: Validation error - {e}")
                    status = colorize("✗ ERROR", Colors.RED, use_color)
            else:
                status = colorize("✓ OK", Colors.GREEN, use_color)
        
        # Mask sensitive values
        display_value = ""
        if value and var.name in ["STRIPE_SECRET_KEY", "SUPABASE_ANON_KEY", 
                                   "PIPEDREAM_CLIENT_SECRET", "QUICKBOOKS_CLIENT_SECRET",
                                   "RESEND_API_KEY"]:
            display_value = f" ({value[:8]}...)"
        elif value:
            display_value = f" ({value[:20]}{'...' if len(value) > 20 else ''})"
        
        print(f"  {status} {var.name}{display_value}")
    
    print("=" * 60)
    
    # Summary
    if errors:
        print(colorize(f"\n❌ {len(errors)} REQUIRED variable(s) missing:", Colors.RED, use_color))
        for err in errors:
            print(f"   • {err}")
    
    if warnings:
        print(colorize(f"\n⚠️  {len(warnings)} RECOMMENDED variable(s) not set:", Colors.YELLOW, use_color))
        for warn in warnings:
            print(f"   • {warn}")
    
    if not errors and not warnings:
        print(colorize("\n✅ All environment variables validated successfully!", Colors.GREEN, use_color))
    elif not errors:
        print(colorize("\n✅ Required variables OK (some optional vars not set)", Colors.GREEN, use_color))
    
    # Determine exit status
    if errors:
        print(colorize("\n🛑 Build cannot proceed without required variables.\n", Colors.RED, use_color))
        return False
    
    if strict and warnings:
        print(colorize("\n🛑 Strict mode: treating warnings as errors.\n", Colors.RED, use_color))
        return False
    
    print()
    return True


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Validate environment variables")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as errors")
    parser.add_argument("--ci", action="store_true", help="CI mode (no colors, exit codes)")
    args = parser.parse_args()
    
    # Load .env file if running locally
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass  # dotenv not required in production
    
    success = validate_env_vars(strict=args.strict, ci_mode=args.ci)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

