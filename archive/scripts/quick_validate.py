#!/usr/bin/env python3
"""
Quick CLI validator for Eqho financial metrics

Runs validation checks against backend API and displays results in terminal.
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Dict, Tuple

import httpx
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

# Load environment variables
load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
SAAS_KPIS_PATH = Path(__file__).parent.parent / "stripe-analysis" / "saas_kpis.json"

console = Console()


async def check_backend_health() -> bool:
    """Check if backend API is accessible"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{API_BASE_URL}/health")
            return response.status_code == 200
    except Exception:
        return False


async def fetch_backend_metrics() -> Dict:
    """Fetch metrics from backend API"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{API_BASE_URL}/api/v1/metrics/summary")
        response.raise_for_status()
        return response.json()


def load_saas_kpis() -> Dict:
    """Load SAAS KPIs from file"""
    if not SAAS_KPIS_PATH.exists():
        raise FileNotFoundError(f"SAAS KPIs file not found: {SAAS_KPIS_PATH}")

    with open(SAAS_KPIS_PATH) as f:
        return json.load(f)


def compare_metrics(backend_data: Dict, saas_kpis: Dict) -> Tuple[Table, bool]:
    """Compare metrics and return table with results"""
    table = Table(
        title="📊 Metric Validation Results", show_header=True, header_style="bold cyan"
    )

    table.add_column("Metric", style="white", width=20)
    table.add_column("Backend API", style="green", justify="right")
    table.add_column("SAAS KPIs", style="yellow", justify="right")
    table.add_column("Δ Diff", style="magenta", justify="right")
    table.add_column("Status", justify="center")

    backend_tp = backend_data.get("towpilot", {})
    file_tp = saas_kpis.get("towpilot", {})

    all_match = True

    def add_comparison(
        name: str,
        backend_val,
        file_val,
        is_currency=True,
        is_percent=False,
        threshold=1.0,
    ):
        nonlocal all_match

        diff = backend_val - file_val
        diff_pct = (diff / file_val * 100) if file_val != 0 else 0

        matches = abs(diff_pct) < threshold
        if not matches:
            all_match = False

        status = "✓" if matches else "✗"
        status_style = "green" if matches else "red"

        if is_currency:
            backend_str = f"${backend_val:,.0f}"
            file_str = f"${file_val:,.0f}"
            diff_str = f"${abs(diff):,.0f}\n({diff_pct:+.1f}%)"
        elif is_percent:
            backend_str = f"{backend_val:.1f}%"
            file_str = f"{file_val:.1f}%"
            diff_str = f"{abs(diff):.1f}pp"
        else:
            backend_str = f"{backend_val}"
            file_str = f"{file_val}"
            diff_str = f"{abs(diff)}\n({diff_pct:+.1f}%)"

        table.add_row(
            name,
            backend_str,
            file_str,
            diff_str,
            f"[{status_style}]{status}[/{status_style}]",
        )

    # Compare key metrics
    add_comparison("MRR", backend_tp.get("mrr", 0), file_tp.get("mrr", 0))
    add_comparison("ARR", backend_tp.get("arr", 0), file_tp.get("arr", 0))
    add_comparison(
        "Customers",
        backend_tp.get("customers", 0),
        file_tp.get("customers", 0),
        is_currency=False,
    )

    # ARPU calculation
    backend_arpu = (
        backend_tp.get("mrr", 0) / backend_tp.get("customers", 1)
        if backend_tp.get("customers")
        else 0
    )
    file_arpu = file_tp.get("arpu", 0)
    add_comparison("ARPU", backend_arpu, file_arpu)

    return table, all_match


async def run_validation():
    """Run full validation workflow"""
    console.print("\n")
    console.print(Panel.fit("🔍 Eqho Financial Data Validator", style="bold blue"))
    console.print()

    # Step 1: Check backend health
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Checking backend API health...", total=None)

        is_healthy = await check_backend_health()

        if not is_healthy:
            console.print("❌ [red]Cannot connect to backend API[/red]")
            console.print(f"   Make sure the backend is running at: {API_BASE_URL}")
            console.print("\n   Start backend with:")
            console.print(
                "   [cyan]cd backend && uvicorn app.main:app --reload[/cyan]\n"
            )
            sys.exit(1)

        progress.update(task, completed=True)

    console.print("✓ [green]Backend API is healthy[/green]")
    console.print()

    # Step 2: Fetch backend metrics
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Fetching metrics from backend API...", total=None)

        try:
            backend_data = await fetch_backend_metrics()
            progress.update(task, completed=True)
            console.print("✓ [green]Fetched backend metrics[/green]")
        except Exception as e:
            console.print(f"❌ [red]Failed to fetch backend metrics: {e}[/red]")
            sys.exit(1)

    console.print()

    # Step 3: Load SAAS KPIs
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Loading SAAS KPIs from file...", total=None)

        try:
            saas_kpis = load_saas_kpis()
            progress.update(task, completed=True)
            console.print("✓ [green]Loaded SAAS KPIs[/green]")
        except Exception as e:
            console.print(f"❌ [red]Failed to load SAAS KPIs: {e}[/red]")
            sys.exit(1)

    console.print()

    # Step 4: Compare metrics
    table, all_match = compare_metrics(backend_data, saas_kpis)
    console.print(table)
    console.print()

    # Step 5: Display backend data
    backend_summary = Table(
        title="Backend API Data (TowPilot)", show_header=True, header_style="bold green"
    )
    backend_summary.add_column("Metric", style="white")
    backend_summary.add_column("Value", style="green", justify="right")

    tp = backend_data.get("towpilot", {})
    backend_summary.add_row("MRR", f"${tp.get('mrr', 0):,.2f}")
    backend_summary.add_row("ARR", f"${tp.get('arr', 0):,.2f}")
    backend_summary.add_row("Customers", f"{tp.get('customers', 0)}")
    backend_summary.add_row("LTV", f"${tp.get('ltv', 0):,.2f}")
    backend_summary.add_row("CAC", f"${tp.get('cac', 0):,.2f}")
    backend_summary.add_row("LTV/CAC Ratio", f"{tp.get('ltv_cac_ratio', 0):.2f}")
    backend_summary.add_row(
        "CAC Payback (months)", f"{tp.get('cac_payback_months', 0):.1f}"
    )
    backend_summary.add_row("Gross Margin", f"{tp.get('gross_margin', 0):.1f}%")

    console.print(backend_summary)
    console.print()

    # Final result
    if all_match:
        console.print(
            Panel.fit(
                "✅ [green bold]All metrics validated successfully![/green bold]",
                style="green",
            )
        )
    else:
        console.print(
            Panel.fit(
                "⚠️  [yellow bold]Some metrics have discrepancies[/yellow bold]",
                style="yellow",
            )
        )
        console.print("   Review the comparison table above for details.")

    console.print()


def main():
    """Main entry point"""
    try:
        asyncio.run(run_validation())
    except KeyboardInterrupt:
        console.print("\n\n[yellow]Validation cancelled[/yellow]\n")
        sys.exit(0)
    except Exception as e:
        console.print(f"\n[red bold]Error:[/red bold] {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
