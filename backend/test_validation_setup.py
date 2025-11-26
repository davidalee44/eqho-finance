#!/usr/bin/env python3
"""
Test script to validate the entire backend and validator setup

Runs a series of checks to ensure everything is configured correctly.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))


def test_python_version():
    """Check Python version"""
    print("🐍 Checking Python version...")
    major, minor = sys.version_info[:2]
    if major >= 3 and minor >= 9:
        print(f"   ✓ Python {major}.{minor} (meets requirement: 3.9+)")
        return True
    else:
        print(f"   ✗ Python {major}.{minor} (requires 3.9+)")
        return False


def test_dependencies():
    """Check if required packages are installed"""
    print("\n📦 Checking dependencies...")
    required = {
        "fastapi": "FastAPI web framework",
        "uvicorn": "ASGI server",
        "stripe": "Stripe API client",
        "httpx": "HTTP client",
        "rich": "Terminal formatting",
        "textual": "TUI framework",
        "supabase": "Supabase client",
    }

    all_installed = True
    for package, description in required.items():
        try:
            __import__(package)
            print(f"   ✓ {package:15} - {description}")
        except ImportError:
            print(f"   ✗ {package:15} - {description} (NOT INSTALLED)")
            all_installed = False

    return all_installed


def test_env_file():
    """Check if .env file exists and has required variables"""
    print("\n🔐 Checking environment configuration...")
    env_path = Path(__file__).parent / ".env"

    if not env_path.exists():
        print("   ⚠️  .env file not found")
        print("      Create one with required variables:")
        print("      - SUPABASE_URL")
        print("      - SUPABASE_ANON_KEY")
        print("      - STRIPE_SECRET_KEY")
        return False

    print("   ✓ .env file exists")

    # Check for required variables (without importing dotenv)
    required_vars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "STRIPE_SECRET_KEY"]
    with open(env_path) as f:
        content = f.read()

    missing = []
    for var in required_vars:
        if f"{var}=" not in content:
            missing.append(var)
        else:
            # Check if it has a value (not just empty)
            for line in content.split("\n"):
                if line.startswith(f"{var}="):
                    value = line.split("=", 1)[1].strip()
                    if value and not value.startswith("#"):
                        print(f"   ✓ {var} is set")
                    else:
                        print(f"   ⚠️  {var} is defined but empty")
                    break

    if missing:
        print(f"   ⚠️  Missing variables: {', '.join(missing)}")
        return False

    return True


def test_data_files():
    """Check if required data files exist"""
    print("\n📁 Checking data files...")
    parent_dir = Path(__file__).parent.parent

    files_to_check = [
        (parent_dir / "stripe-analysis" / "saas_kpis.json", "SAAS KPIs data"),
        (Path(__file__).parent / "requirements.txt", "Backend requirements"),
        (Path(__file__).parent / "validator_requirements.txt", "Validator requirements"),
    ]

    all_exist = True
    for file_path, description in files_to_check:
        if file_path.exists():
            size = file_path.stat().st_size
            print(f"   ✓ {description:30} ({size:,} bytes)")
        else:
            print(f"   ✗ {description:30} (NOT FOUND)")
            all_exist = False

    return all_exist


def test_scripts():
    """Check if validator scripts exist and are executable"""
    print("\n📜 Checking validator scripts...")

    scripts = [
        ("data_validator.py", "Interactive TUI validator"),
        ("quick_validate.py", "Quick CLI validator"),
        ("setup_validator.sh", "Setup script"),
    ]

    all_ok = True
    for script, description in scripts:
        script_path = Path(__file__).parent / script
        if not script_path.exists():
            print(f"   ✗ {script:25} - {description} (NOT FOUND)")
            all_ok = False
            continue

        is_executable = os.access(script_path, os.X_OK)
        if is_executable:
            print(f"   ✓ {script:25} - {description}")
        else:
            print(f"   ⚠️  {script:25} - {description} (not executable)")
            print(f"      Run: chmod +x {script}")
            all_ok = False

    return all_ok


async def test_backend_api():
    """Check if backend API is running"""
    print("\n🌐 Checking backend API...")

    try:
        import httpx

        api_url = os.getenv("API_BASE_URL", "http://localhost:8000")

        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.get(f"{api_url}/health")
                if response.status_code == 200:
                    print(f"   ✓ Backend API is running at {api_url}")
                    return True
                else:
                    print(f"   ⚠️  Backend API returned status {response.status_code}")
                    return False
            except httpx.ConnectError:
                print(f"   ⚠️  Backend API is not running at {api_url}")
                print("      Start it with: uvicorn app.main:app --reload")
                return False
    except ImportError:
        print("   ⚠️  Cannot test API (httpx not installed)")
        return False


def test_app_structure():
    """Check if the app directory structure is correct"""
    print("\n📂 Checking app structure...")

    required_dirs = [
        ("app", "Main application directory"),
        ("app/api", "API routes"),
        ("app/api/v1", "API v1 endpoints"),
        ("app/services", "Business logic services"),
        ("app/core", "Core configuration"),
    ]

    all_exist = True
    for dir_path, description in required_dirs:
        full_path = Path(__file__).parent / dir_path
        if full_path.exists() and full_path.is_dir():
            files_count = len(list(full_path.glob("*.py")))
            print(f"   ✓ {dir_path:20} - {description} ({files_count} files)")
        else:
            print(f"   ✗ {dir_path:20} - {description} (NOT FOUND)")
            all_exist = False

    return all_exist


def print_summary(results):
    """Print summary of all tests"""
    print("\n" + "=" * 60)
    print("📊 VALIDATION SUMMARY")
    print("=" * 60)

    passed = sum(1 for r in results.values() if r)
    total = len(results)

    for test_name, passed_test in results.items():
        status = "✓ PASS" if passed_test else "✗ FAIL"
        print(f"  {status:8} - {test_name}")

    print("=" * 60)
    print(f"  {passed}/{total} checks passed")
    print("=" * 60)

    if passed == total:
        print("\n✅ All checks passed! Setup is ready.")
        print("\n📚 Next steps:")
        print("   1. Start backend: make dev")
        print("   2. Run validator: make validate")
        print("   3. Or use TUI: make validate-tui")
        return True
    else:
        print("\n⚠️  Some checks failed. Review the output above.")
        print("   Run ./setup_validator.sh to fix missing dependencies")
        return False


async def run_all_tests():
    """Run all validation tests"""
    print("🔍 Eqho Backend Validation Setup Test")
    print("=" * 60)

    results = {
        "Python Version": test_python_version(),
        "Dependencies": test_dependencies(),
        "Environment Config": test_env_file(),
        "Data Files": test_data_files(),
        "Validator Scripts": test_scripts(),
        "App Structure": test_app_structure(),
    }

    # Backend API test (can fail without blocking)
    results["Backend API"] = await test_backend_api()

    return print_summary(results)


def main():
    """Main entry point"""
    try:
        success = asyncio.run(run_all_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test cancelled by user\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error running tests: {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()

