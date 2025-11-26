"""
Textual CLI Reporting UI for Eqho Due Diligence

A terminal-based dashboard for verifying data accuracy across:
- Stripe API data
- Cached metrics
- Calculated KPIs

Run with: python -m cli.reports
"""

from datetime import datetime
from typing import Optional

import httpx
from textual import on
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal
from textual.widgets import (
    Button,
    DataTable,
    Footer,
    Header,
    LoadingIndicator,
    Log,
    Rule,
    Static,
    TabbedContent,
    TabPane,
)

# Backend API URL
API_BASE = "http://localhost:8000"


def format_currency(amount: Optional[float]) -> str:
    """Format amount as currency, handling None values."""
    if amount is None:
        return "--"
    return f"${amount:,.0f}"


def format_percent(value: Optional[float]) -> str:
    """Format value as percentage, handling None values."""
    if value is None:
        return "--"
    return f"{value:.1f}%"


def format_timestamp(ts: Optional[str]) -> str:
    """Format ISO timestamp for display."""
    if not ts:
        return "Unknown"
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.strftime("%b %d, %Y %I:%M %p")
    except:
        return ts


class MetricCard(Static):
    """A card displaying a single metric with label and value."""

    def __init__(self, label: str, value: str, sublabel: str = "", variant: str = "default"):
        super().__init__()
        self.label = label
        self.value = value
        self.sublabel = sublabel
        self.variant = variant

    def compose(self) -> ComposeResult:
        yield Static(self.label, classes="metric-label")
        yield Static(self.value, classes=f"metric-value metric-{self.variant}")
        if self.sublabel:
            yield Static(self.sublabel, classes="metric-sublabel")


class DashboardPanel(Static):
    """Main dashboard panel showing key metrics."""

    def __init__(self):
        super().__init__()
        self.metrics = {}
        self.loading = True
        self.error = None

    def compose(self) -> ComposeResult:
        yield Static("📊 Key Metrics Dashboard", classes="panel-title")
        yield Rule()
        yield Container(id="metrics-grid")
        yield Static("", id="data-timestamp")

    async def on_mount(self) -> None:
        await self.refresh_data()

    async def refresh_data(self) -> None:
        """Fetch latest metrics from API."""
        self.loading = True
        grid = self.query_one("#metrics-grid")
        grid.remove_children()
        grid.mount(LoadingIndicator())

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{API_BASE}/api/v1/stripe/comprehensive-metrics")
                response.raise_for_status()
                self.metrics = response.json()
                self.error = None
        except Exception as e:
            self.error = str(e)
            self.metrics = {}

        self.loading = False
        await self.update_display()

    async def update_display(self) -> None:
        """Update the display with current metrics."""
        grid = self.query_one("#metrics-grid")
        grid.remove_children()

        if self.error:
            grid.mount(Static(f"❌ Error: {self.error}", classes="error"))
            return

        if not self.metrics:
            grid.mount(Static("No data available", classes="muted"))
            return

        # Customer Metrics
        cm = self.metrics.get("customer_metrics", {})
        arpu = self.metrics.get("arpu", {})
        churn = self.metrics.get("churn", {})

        # Row 1: Core Metrics
        row1 = Horizontal(classes="metric-row")
        row1.mount(MetricCard(
            "Active Customers",
            str(cm.get("active_customers", "--")),
            f"+{cm.get('net_adds_30d', 0)} last 30d",
            "primary"
        ))
        row1.mount(MetricCard(
            "Monthly MRR",
            format_currency(arpu.get("total_mrr")),
            f"ARR: {format_currency((arpu.get('total_mrr') or 0) * 12)}",
            "success"
        ))
        row1.mount(MetricCard(
            "ARPU",
            format_currency(arpu.get("arpu_monthly")),
            f"Annual: {format_currency(arpu.get('arpu_annual'))}",
            "info"
        ))
        row1.mount(MetricCard(
            "Customer Churn",
            format_percent(churn.get("customer_churn_rate")),
            f"{churn.get('customers_churned', 0)} churned",
            "warning" if (churn.get("customer_churn_rate") or 0) > 5 else "success"
        ))
        grid.mount(row1)

        # Row 2: Retention & Growth
        retention = self.metrics.get("retention_by_segment", {})
        expansion = self.metrics.get("expansion_metrics", {})

        row2 = Horizontal(classes="metric-row")
        row2.mount(MetricCard(
            "Gross Retention",
            format_percent(expansion.get("gross_retention")),
            "Revenue kept from existing",
            "info"
        ))
        row2.mount(MetricCard(
            "Net Retention",
            format_percent(expansion.get("net_retention")),
            "Including expansion",
            "success" if (expansion.get("net_retention") or 0) > 100 else "warning"
        ))
        row2.mount(MetricCard(
            "TowPilot Retention",
            format_percent(retention.get("towpilot", {}).get("retention_rate")),
            f"{retention.get('towpilot', {}).get('active', 0)} active",
            "primary"
        ))
        row2.mount(MetricCard(
            "Revenue Churn",
            format_percent(churn.get("revenue_churn_rate")),
            format_currency(churn.get("mrr_churned")),
            "warning" if (churn.get("revenue_churn_rate") or 0) > 5 else "success"
        ))
        grid.mount(row2)

        # Update timestamp
        ts = self.metrics.get("timestamp", "")
        ts_widget = self.query_one("#data-timestamp")
        ts_widget.update(f"🕐 Data as of: {format_timestamp(ts)}")


class SubscriptionsPanel(Static):
    """Panel showing subscription details with drill-down."""

    def __init__(self):
        super().__init__()
        self.subscriptions = []
        self.loading = True

    def compose(self) -> ComposeResult:
        yield Static("📋 Active Subscriptions", classes="panel-title")
        yield Rule()
        yield Static("", id="sub-summary")
        yield DataTable(id="sub-table")

    async def on_mount(self) -> None:
        table = self.query_one("#sub-table", DataTable)
        table.add_columns("Customer", "Status", "MRR", "Interval", "Created")
        await self.refresh_data()

    async def refresh_data(self) -> None:
        """Fetch subscriptions from API."""
        self.loading = True

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{API_BASE}/api/v1/stripe/subscriptions")
                response.raise_for_status()
                data = response.json()
                self.subscriptions = data.get("subscriptions", [])
        except Exception:
            self.subscriptions = []

        self.loading = False
        await self.update_display()

    async def update_display(self) -> None:
        """Update the subscriptions table."""
        table = self.query_one("#sub-table", DataTable)
        table.clear()

        total_mrr = 0
        monthly_count = 0
        yearly_count = 0

        for sub in self.subscriptions[:100]:  # Limit display for performance
            # Calculate MRR for this subscription
            sub_mrr = 0
            interval = "unknown"
            for item in sub.get("items", []):
                amount = (item.get("amount") or 0) / 100
                item_interval = item.get("interval", "month")
                interval = item_interval
                if item_interval == "year":
                    sub_mrr += amount / 12
                    yearly_count += 1
                else:
                    sub_mrr += amount
                    monthly_count += 1

            total_mrr += sub_mrr

            # Format created date
            created = sub.get("current_period_start", 0)
            created_str = datetime.fromtimestamp(created).strftime("%Y-%m-%d") if created else "--"

            table.add_row(
                sub.get("customer", "--")[:20],
                sub.get("status", "--"),
                format_currency(sub_mrr),
                interval,
                created_str
            )

        # Update summary
        summary = self.query_one("#sub-summary")
        summary.update(
            f"Total: {len(self.subscriptions)} subscriptions | "
            f"Calculated MRR: {format_currency(total_mrr)} | "
            f"Monthly: {monthly_count} | Yearly: {yearly_count}"
        )


class CachePanel(Static):
    """Panel comparing live vs cached data."""

    def __init__(self):
        super().__init__()
        self.cached_data = {}
        self.live_data = {}

    def compose(self) -> ComposeResult:
        yield Static("🗄️ Cache vs Live Data Comparison", classes="panel-title")
        yield Rule()
        yield Container(id="cache-comparison")
        yield Log(id="cache-log", highlight=True)

    async def on_mount(self) -> None:
        await self.refresh_data()

    async def refresh_data(self) -> None:
        """Fetch both cached and live data for comparison."""
        log = self.query_one("#cache-log", Log)
        log.clear()
        log.write_line("Fetching data for comparison...")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Fetch cached data
                log.write_line("📥 Fetching cached metrics...")
                cache_resp = await client.get(f"{API_BASE}/api/v1/stripe/cached")
                cache_resp.raise_for_status()
                self.cached_data = cache_resp.json()
                log.write_line(f"   Found {self.cached_data.get('count', 0)} cached metric types")

                # Fetch live data
                log.write_line("📡 Fetching live comprehensive metrics...")
                live_resp = await client.get(f"{API_BASE}/api/v1/stripe/comprehensive-metrics")
                live_resp.raise_for_status()
                self.live_data = live_resp.json()
                log.write_line("   ✅ Live data retrieved")

        except Exception as e:
            log.write_line(f"❌ Error: {e}")
            return

        await self.compare_data(log)

    async def compare_data(self, log: Log) -> None:
        """Compare cached vs live data and report discrepancies."""
        log.write_line("")
        log.write_line("=" * 50)
        log.write_line("COMPARISON RESULTS")
        log.write_line("=" * 50)

        cached_metrics = self.cached_data.get("metrics", {})

        # Check comprehensive_metrics cache
        if "comprehensive_metrics" in cached_metrics:
            cached = cached_metrics["comprehensive_metrics"]
            cached_data = cached.get("data", {})

            # Compare customer counts
            cached_customers = cached_data.get("customer_metrics", {}).get("active_customers")
            live_customers = self.live_data.get("customer_metrics", {}).get("active_customers")

            if cached_customers != live_customers:
                log.write_line("⚠️  Customer count mismatch:")
                log.write_line(f"   Cached: {cached_customers} | Live: {live_customers}")
            else:
                log.write_line(f"✅ Customer count matches: {live_customers}")

            # Compare MRR
            cached_mrr = cached_data.get("arpu", {}).get("total_mrr")
            live_mrr = self.live_data.get("arpu", {}).get("total_mrr")

            if cached_mrr and live_mrr:
                diff = abs((cached_mrr or 0) - (live_mrr or 0))
                diff_pct = (diff / live_mrr * 100) if live_mrr else 0

                if diff_pct > 1:
                    log.write_line(f"⚠️  MRR mismatch ({diff_pct:.1f}% diff):")
                    log.write_line(f"   Cached: {format_currency(cached_mrr)} | Live: {format_currency(live_mrr)}")
                else:
                    log.write_line(f"✅ MRR matches: {format_currency(live_mrr)}")

            # Show cache freshness
            cached_at = cached.get("fetched_at", "Unknown")
            log.write_line("")
            log.write_line(f"📅 Cache timestamp: {format_timestamp(cached_at)}")
            log.write_line(f"📅 Live timestamp: {format_timestamp(self.live_data.get('timestamp'))}")
        else:
            log.write_line("⚠️  No comprehensive_metrics in cache")

        log.write_line("")
        log.write_line("Comparison complete.")


class ValidationPanel(Static):
    """Panel for running data validation checks."""

    def compose(self) -> ComposeResult:
        yield Static("✅ Data Validation Checks", classes="panel-title")
        yield Rule()
        yield Button("Run All Validations", id="run-validations", variant="primary")
        yield Log(id="validation-log", highlight=True)

    @on(Button.Pressed, "#run-validations")
    async def run_validations(self) -> None:
        """Run all data validation checks."""
        log = self.query_one("#validation-log", Log)
        log.clear()
        log.write_line("Starting validation checks...")
        log.write_line("")

        checks_passed = 0
        checks_failed = 0

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Check 1: API Health
                log.write_line("1️⃣ Checking API health...")
                try:
                    resp = await client.get(f"{API_BASE}/health")
                    if resp.status_code == 200:
                        log.write_line("   ✅ API is healthy")
                        checks_passed += 1
                    else:
                        log.write_line(f"   ❌ API returned {resp.status_code}")
                        checks_failed += 1
                except:
                    log.write_line("   ❌ API unreachable")
                    checks_failed += 1

                # Check 2: Subscriptions data
                log.write_line("")
                log.write_line("2️⃣ Validating subscription data...")
                try:
                    resp = await client.get(f"{API_BASE}/api/v1/stripe/subscriptions")
                    data = resp.json()
                    count = data.get("count", 0)
                    subs = data.get("subscriptions", [])

                    # Validate each subscription has required fields
                    invalid = 0
                    for sub in subs:
                        if not sub.get("id") or not sub.get("customer"):
                            invalid += 1

                    if invalid == 0:
                        log.write_line(f"   ✅ All {count} subscriptions have valid structure")
                        checks_passed += 1
                    else:
                        log.write_line(f"   ⚠️  {invalid}/{count} subscriptions have missing fields")
                        checks_failed += 1
                except Exception as e:
                    log.write_line(f"   ❌ Error: {e}")
                    checks_failed += 1

                # Check 3: MRR calculation consistency
                log.write_line("")
                log.write_line("3️⃣ Validating MRR calculations...")
                try:
                    # Get comprehensive metrics
                    resp = await client.get(f"{API_BASE}/api/v1/stripe/comprehensive-metrics")
                    metrics = resp.json()

                    # Get subscriptions and calculate MRR manually
                    resp = await client.get(f"{API_BASE}/api/v1/stripe/subscriptions")
                    subs = resp.json().get("subscriptions", [])

                    calculated_mrr = 0
                    for sub in subs:
                        for item in sub.get("items", []):
                            amount = (item.get("amount") or 0) / 100
                            interval = item.get("interval", "month")
                            if interval == "year":
                                calculated_mrr += amount / 12
                            else:
                                calculated_mrr += amount

                    reported_mrr = metrics.get("arpu", {}).get("total_mrr", 0)
                    diff = abs(calculated_mrr - reported_mrr)

                    if diff < 100:  # Allow $100 tolerance
                        log.write_line(f"   ✅ MRR consistent: {format_currency(reported_mrr)}")
                        checks_passed += 1
                    else:
                        log.write_line("   ⚠️  MRR mismatch:")
                        log.write_line(f"      Reported: {format_currency(reported_mrr)}")
                        log.write_line(f"      Calculated: {format_currency(calculated_mrr)}")
                        checks_failed += 1
                except Exception as e:
                    log.write_line(f"   ❌ Error: {e}")
                    checks_failed += 1

                # Check 4: Churn data
                log.write_line("")
                log.write_line("4️⃣ Validating churn metrics...")
                try:
                    resp = await client.get(f"{API_BASE}/api/v1/stripe/churn-and-arpu?months=3")
                    data = resp.json()
                    churn = data.get("churn", {})

                    churn_rate = churn.get("customer_churn_rate")
                    if churn_rate is not None and 0 <= churn_rate <= 100:
                        log.write_line(f"   ✅ Churn rate valid: {format_percent(churn_rate)}")
                        checks_passed += 1
                    else:
                        log.write_line(f"   ❌ Invalid churn rate: {churn_rate}")
                        checks_failed += 1
                except Exception as e:
                    log.write_line(f"   ❌ Error: {e}")
                    checks_failed += 1

                # Check 5: Cache freshness
                log.write_line("")
                log.write_line("5️⃣ Checking cache freshness...")
                try:
                    resp = await client.get(f"{API_BASE}/api/v1/stripe/cached")
                    cached = resp.json()

                    stale_count = 0
                    for metric_type, data in cached.get("metrics", {}).items():
                        fetched_at = data.get("fetched_at")
                        if fetched_at:
                            dt = datetime.fromisoformat(fetched_at.replace("Z", "+00:00"))
                            age_hours = (datetime.now(dt.tzinfo) - dt).total_seconds() / 3600
                            if age_hours > 24:
                                stale_count += 1
                                log.write_line(f"   ⚠️  {metric_type} is {age_hours:.0f}h old")

                    if stale_count == 0:
                        log.write_line("   ✅ All cached data is fresh (<24h)")
                        checks_passed += 1
                    else:
                        log.write_line(f"   ⚠️  {stale_count} stale cache entries")
                        checks_failed += 1
                except Exception as e:
                    log.write_line(f"   ❌ Error: {e}")
                    checks_failed += 1

        except Exception as e:
            log.write_line(f"❌ Validation failed: {e}")

        log.write_line("")
        log.write_line("=" * 50)
        log.write_line(f"RESULTS: {checks_passed} passed, {checks_failed} failed")
        log.write_line("=" * 50)


class ReportsApp(App):
    """Main Textual application for data reporting."""

    CSS = """
    Screen {
        background: $surface;
    }
    
    .panel-title {
        text-style: bold;
        color: $accent;
        padding: 1;
    }
    
    .metric-row {
        height: auto;
        margin: 1 0;
    }
    
    MetricCard {
        width: 1fr;
        height: auto;
        border: solid $primary;
        padding: 1 2;
        margin: 0 1;
    }
    
    .metric-label {
        color: $text-muted;
        text-style: italic;
    }
    
    .metric-value {
        text-style: bold;
        text-align: center;
    }
    
    .metric-primary {
        color: $accent;
    }
    
    .metric-success {
        color: $success;
    }
    
    .metric-warning {
        color: $warning;
    }
    
    .metric-info {
        color: $primary;
    }
    
    .metric-sublabel {
        color: $text-muted;
        text-align: center;
    }
    
    .error {
        color: $error;
        padding: 1;
    }
    
    .muted {
        color: $text-muted;
    }
    
    #data-timestamp {
        color: $text-muted;
        text-align: right;
        padding: 1;
    }
    
    #sub-summary {
        padding: 1;
        background: $primary-background;
    }
    
    DataTable {
        height: 1fr;
    }
    
    Log {
        height: 1fr;
        border: solid $primary;
        margin: 1;
    }
    
    Button {
        margin: 1;
    }
    """

    BINDINGS = [
        Binding("q", "quit", "Quit"),
        Binding("r", "refresh", "Refresh"),
        Binding("d", "dashboard", "Dashboard"),
        Binding("s", "subscriptions", "Subscriptions"),
        Binding("c", "cache", "Cache"),
        Binding("v", "validate", "Validate"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        yield TabbedContent(
            TabPane("Dashboard", DashboardPanel(), id="tab-dashboard"),
            TabPane("Subscriptions", SubscriptionsPanel(), id="tab-subscriptions"),
            TabPane("Cache", CachePanel(), id="tab-cache"),
            TabPane("Validation", ValidationPanel(), id="tab-validation"),
        )
        yield Footer()

    def action_quit(self) -> None:
        self.exit()

    async def action_refresh(self) -> None:
        """Refresh the current panel's data."""
        tabs = self.query_one(TabbedContent)
        active = tabs.active

        if active == "tab-dashboard":
            panel = self.query_one(DashboardPanel)
            await panel.refresh_data()
        elif active == "tab-subscriptions":
            panel = self.query_one(SubscriptionsPanel)
            await panel.refresh_data()
        elif active == "tab-cache":
            panel = self.query_one(CachePanel)
            await panel.refresh_data()

    def action_dashboard(self) -> None:
        self.query_one(TabbedContent).active = "tab-dashboard"

    def action_subscriptions(self) -> None:
        self.query_one(TabbedContent).active = "tab-subscriptions"

    def action_cache(self) -> None:
        self.query_one(TabbedContent).active = "tab-cache"

    def action_validate(self) -> None:
        self.query_one(TabbedContent).active = "tab-validation"


def main():
    """Run the reports CLI application."""
    app = ReportsApp()
    app.title = "Eqho Data Validator"
    app.sub_title = "Real-time metrics verification"
    app.run()


if __name__ == "__main__":
    main()


