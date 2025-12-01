#!/usr/bin/env python3
"""
Export Customer MRR to Spreadsheet

Creates a detailed customer-by-customer MRR breakdown that can be opened in Excel/Google Sheets.
Shows exactly what each unique customer contributes to the $145K total.
"""

import asyncio
import csv
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from app.services.stripe_service import StripeService

console = Console()


async def export_customer_mrr():
    """Export customer MRR to CSV and display summary"""

    console.print("\n[bold blue]Customer MRR Export[/bold blue]")
    console.print("=" * 80)
    console.print()

    # Fetch subscriptions
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Fetching subscriptions from Stripe...", total=None)
        all_subs = await StripeService.get_active_subscriptions()
        progress.update(task, completed=True)

    console.print(f"✓ Fetched {len(all_subs)} active subscriptions")
    console.print()

    # Build customer list
    customer_data = []

    for sub in all_subs:
        # Calculate MRR
        sub_mrr = 0.0
        primary_item = None

        for item in sub["items"]:
            amount = item["amount"] / 100

            if amount == 0:
                continue

            interval = item["interval"]
            interval_count = item.get("interval_count", 1)

            # Calculate monthly
            if interval == "year":
                monthly = amount / 12
            elif interval == "month":
                monthly = amount / interval_count
            elif interval == "week":
                monthly = (amount * 52) / 12
            elif interval == "day":
                monthly = amount * 30
            else:
                monthly = 0

            sub_mrr += monthly

            if primary_item is None or amount > (primary_item.get("amount", 0) / 100):
                primary_item = {
                    "amount": amount,
                    "interval": interval,
                    "interval_count": interval_count,
                    "price_id": item["price"]
                }

        if sub_mrr == 0:
            continue

        # Next invoice date
        next_invoice = datetime.fromtimestamp(sub["current_period_end"])

        customer_data.append({
            "customer_id": sub["customer"],
            "subscription_id": sub["id"],
            "mrr": sub_mrr,
            "interval": primary_item["interval"] if primary_item else "unknown",
            "subscription_amount": primary_item["amount"] if primary_item else 0,
            "next_invoice_date": next_invoice.strftime("%Y-%m-%d"),
            "next_invoice_month": next_invoice.strftime("%B %Y"),
            "status": sub["status"]
        })

    # Sort by MRR descending
    customer_data.sort(key=lambda x: x["mrr"], reverse=True)

    # Export to CSV
    output_file = Path(__file__).parent.parent / "customer_mrr_breakdown.csv"

    with open(output_file, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "rank",
            "customer_id",
            "subscription_id",
            "mrr",
            "subscription_amount",
            "interval",
            "next_invoice_date",
            "next_invoice_month",
            "status"
        ])
        writer.writeheader()

        for i, customer in enumerate(customer_data, 1):
            writer.writerow({
                "rank": i,
                **customer
            })

    console.print(f"✓ Exported {len(customer_data)} customers to: [cyan]{output_file}[/cyan]")
    console.print()

    # Display summary table
    table = Table(title="Customer MRR Summary (Top 20)", show_header=True, header_style="bold cyan")

    table.add_column("Rank", style="white", width=5)
    table.add_column("Customer ID", style="yellow", width=22)
    table.add_column("MRR", style="green", justify="right", width=12)
    table.add_column("Interval", style="cyan", width=10)
    table.add_column("Amount", style="magenta", justify="right", width=12)
    table.add_column("Next Invoice", style="blue", width=12)

    for i, customer in enumerate(customer_data[:20], 1):
        table.add_row(
            str(i),
            customer["customer_id"],
            f"${customer['mrr']:,.2f}",
            customer["interval"],
            f"${customer['subscription_amount']:,.2f}",
            customer["next_invoice_date"]
        )

    console.print(table)
    console.print()

    # Display tier breakdown
    tier_table = Table(title="MRR by Customer Tier", show_header=True, header_style="bold green")

    tier_table.add_column("Tier", style="white", width=25)
    tier_table.add_column("Customers", style="yellow", justify="right", width=10)
    tier_table.add_column("Total MRR", style="green", justify="right", width=15)
    tier_table.add_column("% of Total", style="cyan", justify="right", width=12)

    total_mrr = sum(c["mrr"] for c in customer_data)

    tiers = [
        ("Enterprise ($5K+)", [c for c in customer_data if c["mrr"] >= 5000]),
        ("High-Value ($1K-$5K)", [c for c in customer_data if 1000 <= c["mrr"] < 5000]),
        ("Standard ($500-$1K)", [c for c in customer_data if 500 <= c["mrr"] < 1000]),
        ("Growth ($100-$500)", [c for c in customer_data if 100 <= c["mrr"] < 500]),
        ("Starter (<$100)", [c for c in customer_data if c["mrr"] < 100])
    ]

    for tier_name, tier_customers in tiers:
        if tier_customers:
            tier_mrr = sum(c["mrr"] for c in tier_customers)
            tier_pct = (tier_mrr / total_mrr * 100) if total_mrr > 0 else 0
            tier_table.add_row(
                tier_name,
                str(len(tier_customers)),
                f"${tier_mrr:,.2f}",
                f"{tier_pct:.1f}%"
            )

    tier_table.add_row(
        "[bold]TOTAL[/bold]",
        f"[bold]{len(customer_data)}[/bold]",
        f"[bold]${total_mrr:,.2f}[/bold]",
        "[bold]100.0%[/bold]",
        style="bold"
    )

    console.print(tier_table)
    console.print()

    # November collection estimate
    console.print("[bold yellow]November 2025 Collection Estimate[/bold yellow]")
    console.print("-" * 80)

    november_invoices = [c for c in customer_data if c["next_invoice_month"] == "November 2025"]
    december_invoices = [c for c in customer_data if c["next_invoice_month"] == "December 2025"]

    nov_mrr = sum(c["mrr"] for c in november_invoices)
    dec_mrr = sum(c["mrr"] for c in december_invoices)

    console.print(f"Customers with November invoices:  {len(november_invoices):3} → ${nov_mrr:,.2f}")
    console.print(f"Customers with December invoices:  {len(december_invoices):3} → ${dec_mrr:,.2f}")
    console.print()
    console.print("[italic]Note: This is based on next invoice date, not actual collection.[/italic]")
    console.print("[italic]Annual subscriptions invoice once per year, not monthly.[/italic]")
    console.print()

    console.print("[bold green]✓ Export complete![/bold green]")
    console.print(f"\nOpen the CSV file in Excel/Google Sheets: [cyan]{output_file}[/cyan]")
    console.print()


if __name__ == "__main__":
    try:
        asyncio.run(export_customer_mrr())
    except KeyboardInterrupt:
        console.print("\n[yellow]Export cancelled[/yellow]\n")
        sys.exit(0)
    except Exception as e:
        console.print(f"\n[red]Error: {e}[/red]\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)

