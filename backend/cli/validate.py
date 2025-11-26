"""
Quick validation script for data accuracy checks.

Run with: python -m cli.validate

This script runs non-interactively and outputs results to stdout,
suitable for CI/CD pipelines or quick verification.
"""

import asyncio
import json
import sys
from datetime import datetime
from typing import Tuple

import httpx

# Backend API URL
API_BASE = "http://localhost:8000"


def format_currency(amount: float | None) -> str:
    """Format amount as currency."""
    if amount is None:
        return "--"
    return f"${amount:,.0f}"


def format_percent(value: float | None) -> str:
    """Format value as percentage."""
    if value is None:
        return "--"
    return f"{value:.1f}%"


async def check_api_health() -> Tuple[bool, str]:
    """Check if API is healthy."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{API_BASE}/health")
            if resp.status_code == 200:
                return True, "API is healthy"
            return False, f"API returned status {resp.status_code}"
    except Exception as e:
        return False, f"API unreachable: {e}"


async def validate_subscriptions() -> Tuple[bool, str]:
    """Validate subscription data structure."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{API_BASE}/api/v1/stripe/subscriptions")
            resp.raise_for_status()
            data = resp.json()

            count = data.get("count", 0)
            subs = data.get("subscriptions", [])

            invalid = 0
            missing_items = 0
            for sub in subs:
                if not sub.get("id") or not sub.get("customer"):
                    invalid += 1
                if not sub.get("items"):
                    missing_items += 1

            if invalid > 0:
                return False, f"{invalid}/{count} subscriptions have missing required fields"
            if missing_items > 0:
                return False, f"{missing_items}/{count} subscriptions have no items"

            return True, f"All {count} subscriptions valid"
    except Exception as e:
        return False, f"Error: {e}"


async def validate_mrr_consistency() -> Tuple[bool, str]:
    """Validate MRR calculations are consistent."""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Get subscriptions (this is the source of truth for MRR calculation)
            resp = await client.get(f"{API_BASE}/api/v1/stripe/subscriptions")
            resp.raise_for_status()
            subs_data = resp.json()
            subs = subs_data.get("subscriptions", [])

            # Get cached comprehensive metrics instead of recalculating
            try:
                cached_resp = await client.get(f"{API_BASE}/api/v1/stripe/cached/comprehensive_metrics")
                if cached_resp.status_code == 200:
                    metrics = cached_resp.json().get("data", {})
                else:
                    # Fall back to live API
                    resp = await client.get(f"{API_BASE}/api/v1/stripe/comprehensive-metrics")
                    resp.raise_for_status()
                    metrics = resp.json()
            except:
                resp = await client.get(f"{API_BASE}/api/v1/stripe/comprehensive-metrics")
                resp.raise_for_status()
                metrics = resp.json()

            # Calculate MRR from subscriptions
            calculated_mrr = 0
            for sub in subs:
                for item in sub.get("items", []):
                    amount = (item.get("amount") or 0) / 100
                    interval = item.get("interval", "month")
                    interval_count = item.get("interval_count", 1) or 1

                    if interval == "year":
                        calculated_mrr += amount / 12
                    elif interval == "month":
                        calculated_mrr += amount / interval_count

            reported_mrr = metrics.get("arpu", {}).get("total_mrr", 0)
            diff = abs(calculated_mrr - reported_mrr)
            diff_pct = (diff / reported_mrr * 100) if reported_mrr else 0

            if diff_pct > 10:  # Allow 10% tolerance (annual plan normalization varies)
                return False, (
                    f"MRR mismatch ({diff_pct:.1f}% diff): "
                    f"Reported={format_currency(reported_mrr)}, "
                    f"Calculated={format_currency(calculated_mrr)}"
                )

            return True, f"MRR consistent: {format_currency(reported_mrr)} (±{diff_pct:.1f}%)"
    except httpx.TimeoutException:
        return False, "Request timed out (>60s)"
    except Exception as e:
        return False, f"Error: {type(e).__name__}: {e}"


async def validate_churn_metrics() -> Tuple[bool, str]:
    """Validate churn metrics are within reasonable bounds."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(f"{API_BASE}/api/v1/stripe/churn-and-arpu?months=3")
            resp.raise_for_status()
            data = resp.json()

            churn = data.get("churn", {})
            customer_churn = churn.get("customer_churn_rate")
            revenue_churn = churn.get("revenue_churn_rate")

            issues = []

            if customer_churn is None:
                issues.append("customer_churn_rate is null")
            elif customer_churn < 0 or customer_churn > 100:
                issues.append(f"customer_churn_rate invalid: {customer_churn}")

            if revenue_churn is None:
                issues.append("revenue_churn_rate is null")
            elif revenue_churn < 0 or revenue_churn > 100:
                issues.append(f"revenue_churn_rate invalid: {revenue_churn}")

            if issues:
                return False, "; ".join(issues)

            return True, (
                f"Customer churn: {format_percent(customer_churn)}, "
                f"Revenue churn: {format_percent(revenue_churn)}"
            )
    except httpx.TimeoutException:
        return False, "Request timed out (>60s)"
    except Exception as e:
        return False, f"Error: {type(e).__name__}: {e}"


async def validate_customer_metrics() -> Tuple[bool, str]:
    """Validate customer metrics."""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Try cached data first for speed
            try:
                cached_resp = await client.get(f"{API_BASE}/api/v1/stripe/cached/comprehensive_metrics")
                if cached_resp.status_code == 200:
                    data = cached_resp.json().get("data", {})
                else:
                    resp = await client.get(f"{API_BASE}/api/v1/stripe/comprehensive-metrics")
                    resp.raise_for_status()
                    data = resp.json()
            except:
                resp = await client.get(f"{API_BASE}/api/v1/stripe/comprehensive-metrics")
                resp.raise_for_status()
                data = resp.json()

            cm = data.get("customer_metrics", {})
            active = cm.get("active_customers")
            churned = cm.get("churned_customers")

            if active is None or active < 0:
                return False, f"Invalid active_customers: {active}"

            if churned is None or churned < 0:
                return False, f"Invalid churned_customers: {churned}"

            arpu = data.get("arpu", {})
            total_mrr = arpu.get("total_mrr")
            arpu_monthly = arpu.get("arpu_monthly")

            if total_mrr is not None and active > 0:
                expected_arpu = total_mrr / active
                if arpu_monthly and abs(expected_arpu - arpu_monthly) > 50:
                    return False, (
                        f"ARPU mismatch: reported={format_currency(arpu_monthly)}, "
                        f"calculated={format_currency(expected_arpu)}"
                    )

            return True, (
                f"Active: {active}, Churned: {churned}, "
                f"MRR: {format_currency(total_mrr)}, ARPU: {format_currency(arpu_monthly)}"
            )
    except httpx.TimeoutException:
        return False, "Request timed out (>60s)"
    except Exception as e:
        return False, f"Error: {type(e).__name__}: {e}"


async def validate_cache_freshness() -> Tuple[bool, str]:
    """Check if cached data is fresh."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(f"{API_BASE}/api/v1/stripe/cached")
            resp.raise_for_status()
            data = resp.json()

            count = data.get("count", 0)
            if count == 0:
                return False, "No cached data found"

            stale = []
            for metric_type, metric_data in data.get("metrics", {}).items():
                fetched_at = metric_data.get("fetched_at")
                if fetched_at:
                    try:
                        dt = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
                        age_hours = (datetime.now(dt.tzinfo) - dt).total_seconds() / 3600
                        if age_hours > 24:
                            stale.append(f"{metric_type} ({age_hours:.0f}h old)")
                    except:
                        pass

            if stale:
                return False, f"Stale cache entries: {', '.join(stale)}"

            return True, f"All {count} cached metrics are fresh"
    except httpx.TimeoutException:
        return False, "Request timed out (>60s)"
    except Exception as e:
        return False, f"Error: {type(e).__name__}: {e}"


async def run_all_validations() -> int:
    """Run all validation checks and return exit code."""
    print("=" * 60)
    print("EQHO DATA VALIDATION REPORT")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"API: {API_BASE}")
    print("=" * 60)
    print()

    checks = [
        ("API Health", check_api_health),
        ("Subscription Data", validate_subscriptions),
        ("MRR Consistency", validate_mrr_consistency),
        ("Churn Metrics", validate_churn_metrics),
        ("Customer Metrics", validate_customer_metrics),
        ("Cache Freshness", validate_cache_freshness),
    ]

    passed = 0
    failed = 0

    for name, check_fn in checks:
        print(f"Checking: {name}...")
        success, message = await check_fn()

        if success:
            print(f"  ✅ PASS: {message}")
            passed += 1
        else:
            print(f"  ❌ FAIL: {message}")
            failed += 1
        print()

    print("=" * 60)
    print(f"SUMMARY: {passed} passed, {failed} failed")
    print("=" * 60)

    # Return non-zero exit code if any checks failed
    return 0 if failed == 0 else 1


async def export_metrics_json() -> None:
    """Export current metrics as JSON for external comparison."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get all key metrics
            metrics = {}

            # Comprehensive metrics
            resp = await client.get(f"{API_BASE}/api/v1/stripe/comprehensive-metrics")
            if resp.status_code == 200:
                metrics["comprehensive"] = resp.json()

            # Subscriptions
            resp = await client.get(f"{API_BASE}/api/v1/stripe/subscriptions")
            if resp.status_code == 200:
                data = resp.json()
                metrics["subscriptions"] = {
                    "count": data.get("count"),
                    "timestamp": data.get("timestamp"),
                }

            # Churn/ARPU
            resp = await client.get(f"{API_BASE}/api/v1/stripe/churn-and-arpu?months=3")
            if resp.status_code == 200:
                metrics["churn_arpu"] = resp.json()

            # Cache status
            resp = await client.get(f"{API_BASE}/api/v1/stripe/cached")
            if resp.status_code == 200:
                metrics["cache"] = resp.json()

            metrics["exported_at"] = datetime.now().isoformat()

            print(json.dumps(metrics, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


def main():
    """Main entry point."""
    global API_BASE
    import argparse

    parser = argparse.ArgumentParser(
        description="Eqho data validation tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m cli.validate              # Run all validations
  python -m cli.validate --export     # Export metrics as JSON
  python -m cli.validate --api http://prod:8000  # Use different API URL
        """
    )
    parser.add_argument(
        "--export",
        action="store_true",
        help="Export current metrics as JSON instead of validating"
    )
    parser.add_argument(
        "--api",
        default=API_BASE,
        help=f"API base URL (default: {API_BASE})"
    )

    args = parser.parse_args()

    # Update API URL if provided
    API_BASE = args.api

    if args.export:
        asyncio.run(export_metrics_json())
    else:
        exit_code = asyncio.run(run_all_validations())
        sys.exit(exit_code)


if __name__ == "__main__":
    main()

