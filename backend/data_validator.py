#!/usr/bin/env python3
"""
Data Validator TUI - Validate Eqho financial metrics using backend API

This terminal UI connects to the FastAPI backend to fetch and validate
financial metrics against stored data files.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

import httpx
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table
from textual import on, work
from textual.app import App, ComposeResult
from textual.containers import Container, Horizontal
from textual.reactive import reactive
from textual.widgets import Button, Footer, Header, Label, Static, TabbedContent, TabPane

# Load environment variables
load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
SAAS_KPIS_PATH = Path(__file__).parent.parent / "stripe-analysis" / "saas_kpis.json"


class MetricCard(Static):
    """A card displaying a single metric with comparison"""

    value = reactive("")
    label_text = reactive("")
    status = reactive("neutral")  # neutral, match, mismatch
    comparison = reactive("")

    def __init__(self, label: str, **kwargs):
        super().__init__(**kwargs)
        self.label_text = label

    def compose(self) -> ComposeResult:
        yield Label(self.label_text, classes="metric-label")
        yield Label(self.value, classes="metric-value")
        yield Label(self.comparison, classes="metric-comparison")

    def update_value(self, value: str, comparison: str = "", status: str = "neutral"):
        self.value = value
        self.comparison = comparison
        self.status = status

        # Update classes based on status
        if status == "match":
            self.add_class("metric-match")
            self.remove_class("metric-mismatch")
        elif status == "mismatch":
            self.add_class("metric-mismatch")
            self.remove_class("metric-match")
        else:
            self.remove_class("metric-match")
            self.remove_class("metric-mismatch")


class LogViewer(Static):
    """Widget to display operation logs"""

    logs = reactive([])

    def compose(self) -> ComposeResult:
        yield Label("📋 Operation Log", classes="log-header")
        yield Static(id="log-content")

    def add_log(self, message: str, level: str = "info"):
        """Add a log message"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        icon = {"info": "ℹ️", "success": "✓", "error": "✗", "warning": "⚠️"}.get(
            level, "•"
        )
        self.logs.append(f"[{timestamp}] {icon} {message}")

        # Keep only last 50 logs
        if len(self.logs) > 50:
            self.logs = self.logs[-50:]

        # Update display
        log_content = self.query_one("#log-content", Static)
        log_content.update("\n".join(self.logs[-20:]))  # Show last 20


class DataValidator(App):
    """Textual app for validating Eqho financial data"""

    CSS = """
    Screen {
        background: $surface;
    }

    Header {
        background: $primary;
        color: $text;
    }

    #main-container {
        width: 100%;
        height: 100%;
        padding: 1;
    }

    .metric-card {
        border: solid $primary;
        padding: 1;
        margin: 1;
        height: auto;
        min-width: 20;
    }

    .metric-label {
        color: $text-muted;
        text-style: bold;
    }

    .metric-value {
        color: $success;
        text-style: bold;
        text-align: center;
        content-align: center middle;
        width: 100%;
        height: 3;
    }

    .metric-comparison {
        color: $text-muted;
        text-style: italic;
        text-align: center;
        height: auto;
    }

    .metric-match {
        border: solid $success;
        background: $success 10%;
    }

    .metric-mismatch {
        border: solid $error;
        background: $error 10%;
    }

    .button-row {
        height: auto;
        width: 100%;
        align: center middle;
        padding: 1;
    }

    Button {
        margin: 0 1;
    }

    .metrics-grid {
        layout: grid;
        grid-size: 3;
        grid-gutter: 1;
        width: 100%;
        height: auto;
    }

    .log-viewer {
        border: solid $primary;
        padding: 1;
        margin-top: 1;
        height: 15;
        overflow-y: auto;
    }

    .log-header {
        color: $text;
        text-style: bold;
        padding-bottom: 1;
    }

    #log-content {
        color: $text-muted;
        height: auto;
    }

    .status-bar {
        background: $panel;
        color: $text;
        padding: 1;
        text-align: center;
        height: auto;
    }

    TabbedContent {
        height: 100%;
    }

    TabPane {
        padding: 1;
    }
    """

    BINDINGS = [
        ("q", "quit", "Quit"),
        ("r", "refresh", "Refresh"),
        ("c", "clear_logs", "Clear Logs"),
    ]

    def __init__(self):
        super().__init__()
        self.backend_data: Optional[Dict] = None
        self.saas_kpis: Optional[Dict] = None
        self.api_status = "🔴 Not Connected"

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)

        with Container(id="main-container"):
            # Status bar
            yield Static(self.api_status, classes="status-bar", id="status-bar")

            # Tabbed content
            with TabbedContent():
                # Tab 1: Backend Metrics
                with TabPane("Backend Metrics", id="tab-backend"):
                    with Horizontal(classes="button-row"):
                        yield Button("Fetch Metrics", id="fetch-backend", variant="primary")
                        yield Button("Test API Health", id="test-health")

                    with Container(classes="metrics-grid"):
                        yield MetricCard("MRR", id="metric-mrr", classes="metric-card")
                        yield MetricCard("ARR", id="metric-arr", classes="metric-card")
                        yield MetricCard("Customers", id="metric-customers", classes="metric-card")
                        yield MetricCard("ARPU", id="metric-arpu", classes="metric-card")
                        yield MetricCard("Retention", id="metric-retention", classes="metric-card")
                        yield MetricCard("TowPilot MRR", id="metric-tp-mrr", classes="metric-card")

                # Tab 2: Comparison
                with TabPane("Compare Sources", id="tab-compare"):
                    with Horizontal(classes="button-row"):
                        yield Button("Load Comparison", id="load-comparison", variant="primary")

                    yield Static("", id="comparison-output")

                # Tab 3: Stripe Direct
                with TabPane("Stripe Analysis", id="tab-stripe"):
                    with Horizontal(classes="button-row"):
                        yield Button("Load SAAS KPIs", id="load-saas-kpis", variant="primary")

                    yield Static("", id="saas-kpis-output")

            # Log viewer
            yield LogViewer(classes="log-viewer", id="log-viewer")

        yield Footer()

    def on_mount(self) -> None:
        """Initialize the app on mount"""
        self.log("Data Validator started", "success")
        self.log(f"Backend API: {API_BASE_URL}", "info")

        # Auto-check API health
        self.check_api_health()

    def log(self, message: str, level: str = "info"):
        """Add a log message"""
        log_viewer = self.query_one("#log-viewer", LogViewer)
        log_viewer.add_log(message, level)

    @work(exclusive=True)
    async def check_api_health(self):
        """Check if backend API is healthy"""
        self.log("Checking backend API health...", "info")

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{API_BASE_URL}/health")
                if response.status_code == 200:
                    self.api_status = "🟢 Backend Connected"
                    self.log("✓ Backend API is healthy", "success")
                else:
                    self.api_status = f"🟡 Backend responding with {response.status_code}"
                    self.log(f"⚠️  Backend returned status {response.status_code}", "warning")
        except httpx.ConnectError:
            self.api_status = "🔴 Cannot connect to backend"
            self.log("✗ Cannot connect to backend API", "error")
        except Exception as e:
            self.api_status = f"🔴 Error: {str(e)[:30]}"
            self.log(f"✗ Error checking health: {e}", "error")

        # Update status bar
        status_bar = self.query_one("#status-bar", Static)
        status_bar.update(self.api_status)

    @on(Button.Pressed, "#test-health")
    def handle_test_health(self):
        """Handle test health button"""
        self.check_api_health()

    @on(Button.Pressed, "#fetch-backend")
    def handle_fetch_backend(self):
        """Handle fetch backend metrics button"""
        self.fetch_backend_metrics()

    @work(exclusive=True)
    async def fetch_backend_metrics(self):
        """Fetch metrics from backend API"""
        self.log("Fetching metrics from backend API...", "info")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Fetch summary metrics
                response = await client.get(f"{API_BASE_URL}/api/v1/metrics/summary")

                if response.status_code == 200:
                    data = response.json()
                    self.backend_data = data

                    # Update metric cards
                    tp = data.get("towpilot", {})

                    self.query_one("#metric-mrr", MetricCard).update_value(
                        f"${tp.get('mrr', 0):,.2f}", "", "neutral"
                    )
                    self.query_one("#metric-arr", MetricCard).update_value(
                        f"${tp.get('arr', 0):,.2f}", "", "neutral"
                    )
                    self.query_one("#metric-customers", MetricCard).update_value(
                        f"{tp.get('customers', 0)}", "", "neutral"
                    )

                    arpu = tp.get("mrr", 0) / tp.get("customers", 1) if tp.get("customers") else 0
                    self.query_one("#metric-arpu", MetricCard).update_value(
                        f"${arpu:,.2f}", "", "neutral"
                    )

                    self.query_one("#metric-retention", MetricCard).update_value(
                        f"{tp.get('gross_margin', 0):.1f}%", "", "neutral"
                    )

                    self.query_one("#metric-tp-mrr", MetricCard).update_value(
                        f"${tp.get('mrr', 0):,.2f}", "", "neutral"
                    )

                    self.log("✓ Successfully fetched backend metrics", "success")
                else:
                    self.log(f"✗ Backend returned status {response.status_code}", "error")

        except httpx.ConnectError:
            self.log("✗ Cannot connect to backend - is it running?", "error")
        except Exception as e:
            self.log(f"✗ Error fetching metrics: {e}", "error")

    @on(Button.Pressed, "#load-saas-kpis")
    def handle_load_saas_kpis(self):
        """Handle load SAAS KPIs button"""
        self.load_saas_kpis()

    @work(exclusive=True)
    async def load_saas_kpis(self):
        """Load SAAS KPIs from file"""
        self.log("Loading SAAS KPIs from file...", "info")

        try:
            if not SAAS_KPIS_PATH.exists():
                self.log(f"✗ File not found: {SAAS_KPIS_PATH}", "error")
                return

            with open(SAAS_KPIS_PATH) as f:
                self.saas_kpis = json.load(f)

            # Create a rich table
            console = Console()
            table = Table(title="SAAS KPIs (from Stripe Analysis)")

            table.add_column("Metric", style="cyan")
            table.add_column("Total", style="green")
            table.add_column("TowPilot", style="yellow")
            table.add_column("Other", style="magenta")

            total = self.saas_kpis.get("total", {})
            tp = self.saas_kpis.get("towpilot", {})
            other = self.saas_kpis.get("other", {})

            table.add_row(
                "MRR",
                f"${total.get('mrr', 0):,.2f}",
                f"${tp.get('mrr', 0):,.2f}",
                f"${other.get('mrr', 0):,.2f}",
            )
            table.add_row(
                "ARR",
                f"${total.get('arr', 0):,.2f}",
                f"${tp.get('arr', 0):,.2f}",
                f"${other.get('arr', 0):,.2f}",
            )
            table.add_row(
                "Customers",
                f"{total.get('customers', 0)}",
                f"{tp.get('customers', 0)}",
                f"{other.get('customers', 0)}",
            )
            table.add_row(
                "ARPU",
                f"${total.get('arpu', 0):,.2f}",
                f"${tp.get('arpu', 0):,.2f}",
                f"${other.get('arpu', 0):,.2f}",
            )
            table.add_row(
                "Retention",
                f"{total.get('retention_rate', 0):.1f}%",
                f"{tp.get('retention_rate', 0):.1f}%",
                f"{other.get('retention_rate', 0):.1f}%",
            )

            # Render table to string
            with console.capture() as capture:
                console.print(table)
            output = capture.get()

            output_widget = self.query_one("#saas-kpis-output", Static)
            output_widget.update(output)

            self.log("✓ Loaded SAAS KPIs successfully", "success")

        except Exception as e:
            self.log(f"✗ Error loading SAAS KPIs: {e}", "error")

    @on(Button.Pressed, "#load-comparison")
    def handle_load_comparison(self):
        """Handle load comparison button"""
        self.load_comparison()

    @work(exclusive=True)
    async def load_comparison(self):
        """Load and compare data from both sources"""
        self.log("Loading comparison...", "info")

        # Check if we have data
        if not self.saas_kpis:
            await self.load_saas_kpis()

        if not self.backend_data:
            await self.fetch_backend_metrics()

        if not self.saas_kpis or not self.backend_data:
            self.log("✗ Need both data sources for comparison", "error")
            return

        # Compare metrics
        console = Console()
        table = Table(title="Data Source Comparison")

        table.add_column("Metric", style="cyan")
        table.add_column("Backend API", style="green")
        table.add_column("SAAS KPIs File", style="yellow")
        table.add_column("Δ Difference", style="magenta")
        table.add_column("Status", style="bold")

        # Compare TowPilot metrics
        backend_tp = self.backend_data.get("towpilot", {})
        file_tp = self.saas_kpis.get("towpilot", {})

        def compare_metric(name: str, backend_val, file_val, is_currency=True, is_percent=False):
            diff = backend_val - file_val
            diff_pct = (diff / file_val * 100) if file_val != 0 else 0

            status = "✓ Match" if abs(diff_pct) < 1 else "✗ Mismatch"
            status_style = "green" if abs(diff_pct) < 1 else "red"

            if is_currency:
                backend_str = f"${backend_val:,.2f}"
                file_str = f"${file_val:,.2f}"
                diff_str = f"${diff:,.2f} ({diff_pct:+.1f}%)"
            elif is_percent:
                backend_str = f"{backend_val:.1f}%"
                file_str = f"{file_val:.1f}%"
                diff_str = f"{diff:+.1f}pp"
            else:
                backend_str = f"{backend_val}"
                file_str = f"{file_val}"
                diff_str = f"{diff:+} ({diff_pct:+.1f}%)"

            table.add_row(name, backend_str, file_str, diff_str, f"[{status_style}]{status}[/]")

        compare_metric("MRR", backend_tp.get("mrr", 0), file_tp.get("mrr", 0), is_currency=True)
        compare_metric("ARR", backend_tp.get("arr", 0), file_tp.get("arr", 0), is_currency=True)
        compare_metric("Customers", backend_tp.get("customers", 0), file_tp.get("customers", 0), is_currency=False)

        # Render table
        with console.capture() as capture:
            console.print(table)
        output = capture.get()

        output_widget = self.query_one("#comparison-output", Static)
        output_widget.update(output)

        self.log("✓ Comparison complete", "success")

    def action_refresh(self):
        """Refresh all data"""
        self.log("Refreshing all data...", "info")
        self.check_api_health()
        self.fetch_backend_metrics()

    def action_clear_logs(self):
        """Clear the log viewer"""
        log_viewer = self.query_one("#log-viewer", LogViewer)
        log_viewer.logs = []
        log_content = log_viewer.query_one("#log-content", Static)
        log_content.update("")
        self.log("Logs cleared", "info")


def main():
    """Run the data validator app"""
    app = DataValidator()
    app.run()


if __name__ == "__main__":
    main()

